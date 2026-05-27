package handlers

import (
	"context"
	"net/http"

	"github.com/anomalyco/project-manager/internal/database"
	"github.com/anomalyco/project-manager/internal/middleware"
	"github.com/anomalyco/project-manager/internal/models"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

type CreateStatusInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	Body struct {
		Name  string `json:"name" minLength:"1" maxLength:"50"`
		Color string `json:"color,omitempty" maxLength:"7"`
		Order int    `json:"order,omitempty"`
	}
}

type UpdateStatusInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	StatusID      string `path:"statusId"`
	Body struct {
		Name  string `json:"name,omitempty" maxLength:"50"`
		Color string `json:"color,omitempty" maxLength:"7"`
		Order int    `json:"order,omitempty"`
	}
}

type DeleteStatusInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	StatusID      string `path:"statusId"`
}

type StatusOutput struct {
	Body struct {
		ID        uuid.UUID `json:"id"`
		ProjectID uuid.UUID `json:"projectId"`
		Name      string    `json:"name"`
		Color     string    `json:"color"`
		Order     int       `json:"order"`
		CreatedAt string    `json:"createdAt"`
	}
}

func RegisterStatusRoutes(api huma.API, db *database.DB) {
	huma.Register(api, huma.Operation{
		OperationID: "createStatus",
		Method:      http.MethodPost,
		Path:        "/api/projects/{projectId}/statuses",
		Summary:     "Create a task status",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Statuses"},
	}, func(ctx context.Context, input *CreateStatusInput) (*StatusOutput, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, err := uuid.Parse(input.ProjectID)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid project id")
		}

		var count int64
		db.Gorm.Model(&models.ProjectMember{}).Where("project_id = ? AND user_id = ?", projectID, claims.UserID).Count(&count)
		if count == 0 {
			return nil, huma.Error403Forbidden("not a member of this project")
		}

		status := &models.TaskStatus{
			ProjectID: projectID,
			Name:      input.Body.Name,
			Color:     input.Body.Color,
			Order:     input.Body.Order,
		}
		if status.Color == "" {
			status.Color = "#6B7280"
		}

		if result := db.Gorm.Create(status); result.Error != nil {
			return nil, huma.Error500InternalServerError("failed to create status")
		}

		resp := &StatusOutput{}
		resp.Body.ID = status.ID
		resp.Body.ProjectID = status.ProjectID
		resp.Body.Name = status.Name
		resp.Body.Color = status.Color
		resp.Body.Order = status.Order
		resp.Body.CreatedAt = status.CreatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "updateStatus",
		Method:      http.MethodPut,
		Path:        "/api/projects/{projectId}/statuses/{statusId}",
		Summary:     "Update a task status",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Statuses"},
	}, func(ctx context.Context, input *UpdateStatusInput) (*StatusOutput, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, _ := uuid.Parse(input.ProjectID)
		statusID, _ := uuid.Parse(input.StatusID)

		var status models.TaskStatus
		if result := db.Gorm.First(&status, "id = ? AND project_id = ?", statusID, projectID); result.Error != nil {
			return nil, huma.Error404NotFound("status not found")
		}

		if input.Body.Name != "" {
			status.Name = input.Body.Name
		}
		if input.Body.Color != "" {
			status.Color = input.Body.Color
		}
		status.Order = input.Body.Order

		db.Gorm.Save(&status)

		resp := &StatusOutput{}
		resp.Body.ID = status.ID
		resp.Body.ProjectID = status.ProjectID
		resp.Body.Name = status.Name
		resp.Body.Color = status.Color
		resp.Body.Order = status.Order
		resp.Body.CreatedAt = status.CreatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "deleteStatus",
		Method:      http.MethodDelete,
		Path:        "/api/projects/{projectId}/statuses/{statusId}",
		Summary:     "Delete a task status",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Statuses"},
	}, func(ctx context.Context, input *DeleteStatusInput) (*struct{}, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, _ := uuid.Parse(input.ProjectID)
		statusID, _ := uuid.Parse(input.StatusID)

		result := db.Gorm.Where("id = ? AND project_id = ?", statusID, projectID).Delete(&models.TaskStatus{})
		if result.RowsAffected == 0 {
			return nil, huma.Error404NotFound("status not found")
		}

		return nil, nil
	})
}
