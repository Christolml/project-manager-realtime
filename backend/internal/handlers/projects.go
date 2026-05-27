package handlers

import (
	"context"
	"net/http"

	"github.com/anomalyco/project-manager/internal/database"
	"github.com/anomalyco/project-manager/internal/models"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreateProjectInput struct {
	Authorization string `header:"Authorization"`
	Body struct {
		Name        string `json:"name" minLength:"1" maxLength:"100"`
		Description string `json:"description,omitempty" maxLength:"500"`
	}
}

type ProjectOutput struct {
	Body struct {
		ID          uuid.UUID `json:"id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		OwnerID     uuid.UUID `json:"ownerId"`
		CreatedAt   string    `json:"createdAt"`
	}
}

type ProjectListOutput struct {
	Body []struct {
		ID          uuid.UUID `json:"id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		OwnerID     uuid.UUID `json:"ownerId"`
		TaskCount   int64     `json:"taskCount"`
		CreatedAt   string    `json:"createdAt"`
	}
}

type ProjectDetailOutput struct {
	Body struct {
		ID          uuid.UUID              `json:"id"`
		Name        string                 `json:"name"`
		Description string                 `json:"description"`
		OwnerID     uuid.UUID              `json:"ownerId"`
		Statuses    []models.TaskStatus    `json:"statuses"`
		Members     []models.ProjectMember `json:"members"`
		CreatedAt   string                 `json:"createdAt"`
		UpdatedAt   string                 `json:"updatedAt"`
	}
}

type UpdateProjectInput struct {
	Authorization string `header:"Authorization"`
	ID            string `path:"id"`
	Body struct {
		Name        string `json:"name,omitempty" maxLength:"100"`
		Description string `json:"description,omitempty" maxLength:"500"`
	}
}

type DeleteProjectInput struct {
	Authorization string `header:"Authorization"`
	ID            string `path:"id"`
}

type listProjectsInput struct {
	Authorization string `header:"Authorization"`
}

type getProjectInput struct {
	Authorization string `header:"Authorization"`
	ID            string `path:"id"`
}

func RegisterProjectRoutes(api huma.API, db *database.DB, jwtSecret string) {
	huma.Register(api, huma.Operation{
		OperationID: "createProject",
		Method:      http.MethodPost,
		Path:        "/api/projects",
		Summary:     "Create a new project",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Projects"},
	}, func(ctx context.Context, input *CreateProjectInput) (*ProjectOutput, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		project := &models.Project{
			Name:        input.Body.Name,
			Description: input.Body.Description,
			OwnerID:     claims.UserID,
		}

		if result := db.Gorm.Create(project); result.Error != nil {
			return nil, huma.Error500InternalServerError("failed to create project")
		}

		db.Gorm.Create(&models.ProjectMember{
			ProjectID: project.ID, UserID: claims.UserID, Role: "admin",
		})

		for _, s := range []models.TaskStatus{
			{ProjectID: project.ID, Name: "To Do", Color: "#6B7280", Order: 0},
			{ProjectID: project.ID, Name: "In Progress", Color: "#3B82F6", Order: 1},
			{ProjectID: project.ID, Name: "Done", Color: "#10B981", Order: 2},
		} {
			db.Gorm.Create(&s)
		}

		resp := &ProjectOutput{}
		resp.Body.ID = project.ID
		resp.Body.Name = project.Name
		resp.Body.Description = project.Description
		resp.Body.OwnerID = project.OwnerID
		resp.Body.CreatedAt = project.CreatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "listProjects",
		Method:      http.MethodGet,
		Path:        "/api/projects",
		Summary:     "List user projects",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Projects"},
	}, func(ctx context.Context, input *listProjectsInput) (*ProjectListOutput, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		var projects []models.Project
		db.Gorm.Where("owner_id = ?", claims.UserID).
			Or("id IN (SELECT project_id FROM project_members WHERE user_id = ?)", claims.UserID).
			Preload("Tasks").
			Find(&projects)

		resp := &ProjectListOutput{}
		for _, p := range projects {
			resp.Body = append(resp.Body, struct {
				ID          uuid.UUID `json:"id"`
				Name        string    `json:"name"`
				Description string    `json:"description"`
				OwnerID     uuid.UUID `json:"ownerId"`
				TaskCount   int64     `json:"taskCount"`
				CreatedAt   string    `json:"createdAt"`
			}{
				ID:          p.ID,
				Name:        p.Name,
				Description: p.Description,
				OwnerID:     p.OwnerID,
				TaskCount:   int64(len(p.Tasks)),
				CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
			})
		}
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "getProject",
		Method:      http.MethodGet,
		Path:        "/api/projects/{id}",
		Summary:     "Get project details",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Projects"},
	}, func(ctx context.Context, input *getProjectInput) (*ProjectDetailOutput, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, err := mustParseUUID(input.ID)
		if err != nil {
			return nil, err
		}

		var project models.Project
		result := db.Gorm.
			Preload("Statuses", func(d *gorm.DB) *gorm.DB { return d.Order("status_order ASC") }).
			Preload("Members.User").
			First(&project, "id = ?", projectID)

		if result.Error != nil {
			return nil, huma.Error404NotFound("project not found")
		}

		if project.OwnerID != claims.UserID {
			var memberCount int64
			db.Gorm.Model(&models.ProjectMember{}).
				Where("project_id = ? AND user_id = ?", projectID, claims.UserID).
				Count(&memberCount)
			if memberCount == 0 {
				return nil, huma.Error404NotFound("project not found")
			}
		}

		resp := &ProjectDetailOutput{}
		resp.Body.ID = project.ID
		resp.Body.Name = project.Name
		resp.Body.Description = project.Description
		resp.Body.OwnerID = project.OwnerID
		resp.Body.Statuses = project.Statuses
		resp.Body.Members = project.Members
		resp.Body.CreatedAt = project.CreatedAt.Format("2006-01-02T15:04:05Z")
		resp.Body.UpdatedAt = project.UpdatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "updateProject",
		Method:      http.MethodPut,
		Path:        "/api/projects/{id}",
		Summary:     "Update project",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Projects"},
	}, func(ctx context.Context, input *UpdateProjectInput) (*ProjectOutput, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, err := mustParseUUID(input.ID)
		if err != nil {
			return nil, err
		}

		var project models.Project
		if result := db.Gorm.First(&project, "id = ? AND owner_id = ?", projectID, claims.UserID); result.Error != nil {
			return nil, huma.Error404NotFound("project not found")
		}

		if input.Body.Name != "" {
			project.Name = input.Body.Name
		}
		project.Description = input.Body.Description
		db.Gorm.Save(&project)

		resp := &ProjectOutput{}
		resp.Body.ID = project.ID
		resp.Body.Name = project.Name
		resp.Body.Description = project.Description
		resp.Body.OwnerID = project.OwnerID
		resp.Body.CreatedAt = project.CreatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "deleteProject",
		Method:      http.MethodDelete,
		Path:        "/api/projects/{id}",
		Summary:     "Delete project",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Projects"},
	}, func(ctx context.Context, input *DeleteProjectInput) (*struct{}, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, err := mustParseUUID(input.ID)
		if err != nil {
			return nil, err
		}

		db.Gorm.Where("project_id = ?", projectID).Delete(&models.Task{})
		db.Gorm.Where("project_id = ?", projectID).Delete(&models.TaskStatus{})
		db.Gorm.Where("project_id = ?", projectID).Delete(&models.ProjectMember{})

		result := db.Gorm.Where("id = ? AND owner_id = ?", projectID, claims.UserID).Delete(&models.Project{})
		if result.RowsAffected == 0 {
			return nil, huma.Error404NotFound("project not found")
		}
		return nil, nil
	})
}
