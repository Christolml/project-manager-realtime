package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/anomalyco/project-manager/internal/database"
	"github.com/anomalyco/project-manager/internal/middleware"
	"github.com/anomalyco/project-manager/internal/models"
	ws "github.com/anomalyco/project-manager/internal/websocket"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

type CreateTaskInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	Body struct {
		Title       string     `json:"title" minLength:"1" maxLength:"200"`
		Description string     `json:"description,omitempty" maxLength:"2000"`
		StatusID    string     `json:"statusId"`
		AssignedTo  *string    `json:"assignedTo,omitempty"`
		DueDate     *time.Time `json:"dueDate,omitempty"`
	}
}

type UpdateTaskInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	TaskID        string `path:"taskId"`
	Body struct {
		Title       string     `json:"title,omitempty" maxLength:"200"`
		Description string     `json:"description,omitempty" maxLength:"2000"`
		StatusID    string     `json:"statusId,omitempty"`
		AssignedTo  *string    `json:"assignedTo,omitempty"`
		DueDate     *time.Time `json:"dueDate,omitempty"`
	}
}

type MoveTaskInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	TaskID        string `path:"taskId"`
	Body struct {
		StatusID string `json:"statusId"`
	}
}

type DeleteTaskInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	TaskID        string `path:"taskId"`
}

type TaskOutput struct {
	Body struct {
		ID          uuid.UUID  `json:"id"`
		ProjectID   uuid.UUID  `json:"projectId"`
		Title       string     `json:"title"`
		Description string     `json:"description"`
		StatusID    uuid.UUID  `json:"statusId"`
		AssignedTo  *uuid.UUID `json:"assignedTo"`
		DueDate     *time.Time `json:"dueDate"`
		CreatedBy   uuid.UUID  `json:"createdBy"`
		CreatedAt   string     `json:"createdAt"`
		UpdatedAt   string     `json:"updatedAt"`
	}
}

type ListTasksInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
}

type ListTasksOutput struct {
	Body []models.Task
}

func RegisterTaskRoutes(api huma.API, db *database.DB, hub *ws.Hub) {
	huma.Register(api, huma.Operation{
		OperationID: "listTasks",
		Method:      http.MethodGet,
		Path:        "/api/projects/{projectId}/tasks",
		Summary:     "List tasks in a project",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Tasks"},
	}, func(ctx context.Context, input *ListTasksInput) (*ListTasksOutput, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, _ := uuid.Parse(input.ProjectID)

		var tasks []models.Task
		db.Gorm.Where("project_id = ?", projectID).
			Preload("Status").
			Preload("Assignee").
			Preload("Creator").
			Order("created_at DESC").
			Find(&tasks)

		resp := &ListTasksOutput{Body: tasks}
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "createTask",
		Method:      http.MethodPost,
		Path:        "/api/projects/{projectId}/tasks",
		Summary:     "Create a task",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Tasks"},
	}, func(ctx context.Context, input *CreateTaskInput) (*TaskOutput, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, err := uuid.Parse(input.ProjectID)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid project id")
		}

		statusID, err := uuid.Parse(input.Body.StatusID)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid status id")
		}

		task := &models.Task{
			ProjectID:   projectID,
			Title:       input.Body.Title,
			Description: input.Body.Description,
			StatusID:    statusID,
			CreatedBy:   claims.UserID,
			DueDate:     input.Body.DueDate,
		}

		if input.Body.AssignedTo != nil {
			uid, err := uuid.Parse(*input.Body.AssignedTo)
			if err == nil {
				task.AssignedTo = &uid
			}
		}

		if result := db.Gorm.Create(task); result.Error != nil {
			return nil, huma.Error500InternalServerError("failed to create task")
		}

		hub.Broadcast(projectID, &ws.Message{
			Type:      "taskCreated",
			ProjectID: projectID,
			Data:      task,
			UserID:    claims.UserID,
		})

		resp := &TaskOutput{}
		resp.Body.ID = task.ID
		resp.Body.ProjectID = task.ProjectID
		resp.Body.Title = task.Title
		resp.Body.Description = task.Description
		resp.Body.StatusID = task.StatusID
		resp.Body.AssignedTo = task.AssignedTo
		resp.Body.DueDate = task.DueDate
		resp.Body.CreatedBy = task.CreatedBy
		resp.Body.CreatedAt = task.CreatedAt.Format("2006-01-02T15:04:05Z")
		resp.Body.UpdatedAt = task.UpdatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "updateTask",
		Method:      http.MethodPut,
		Path:        "/api/projects/{projectId}/tasks/{taskId}",
		Summary:     "Update a task",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Tasks"},
	}, func(ctx context.Context, input *UpdateTaskInput) (*TaskOutput, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, _ := uuid.Parse(input.ProjectID)
		taskID, _ := uuid.Parse(input.TaskID)

		var task models.Task
		if result := db.Gorm.First(&task, "id = ? AND project_id = ?", taskID, projectID); result.Error != nil {
			return nil, huma.Error404NotFound("task not found")
		}

		if input.Body.Title != "" {
			task.Title = input.Body.Title
		}
		if input.Body.Description != "" {
			task.Description = input.Body.Description
		}
		if input.Body.StatusID != "" {
			if sid, err := uuid.Parse(input.Body.StatusID); err == nil {
				task.StatusID = sid
			}
		}
		if input.Body.DueDate != nil {
			task.DueDate = input.Body.DueDate
		}
		if input.Body.AssignedTo != nil {
			if *input.Body.AssignedTo == "" {
				task.AssignedTo = nil
			} else if uid, err := uuid.Parse(*input.Body.AssignedTo); err == nil {
				task.AssignedTo = &uid
			}
		}

		db.Gorm.Save(&task)

		hub.Broadcast(projectID, &ws.Message{
			Type:      "taskUpdated",
			ProjectID: projectID,
			Data:      task,
			UserID:    claims.UserID,
		})

		resp := &TaskOutput{}
		resp.Body.ID = task.ID
		resp.Body.ProjectID = task.ProjectID
		resp.Body.Title = task.Title
		resp.Body.Description = task.Description
		resp.Body.StatusID = task.StatusID
		resp.Body.AssignedTo = task.AssignedTo
		resp.Body.DueDate = task.DueDate
		resp.Body.CreatedBy = task.CreatedBy
		resp.Body.CreatedAt = task.CreatedAt.Format("2006-01-02T15:04:05Z")
		resp.Body.UpdatedAt = task.UpdatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "moveTask",
		Method:      http.MethodPatch,
		Path:        "/api/projects/{projectId}/tasks/{taskId}/move",
		Summary:     "Move task to a different status",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Tasks"},
	}, func(ctx context.Context, input *MoveTaskInput) (*TaskOutput, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, _ := uuid.Parse(input.ProjectID)
		taskID, _ := uuid.Parse(input.TaskID)
		statusID, _ := uuid.Parse(input.Body.StatusID)

		var task models.Task
		if result := db.Gorm.First(&task, "id = ? AND project_id = ?", taskID, projectID); result.Error != nil {
			return nil, huma.Error404NotFound("task not found")
		}

		task.StatusID = statusID
		db.Gorm.Save(&task)

		hub.Broadcast(projectID, &ws.Message{
			Type:      "taskUpdated",
			ProjectID: projectID,
			Data:      task,
			UserID:    claims.UserID,
		})

		resp := &TaskOutput{}
		resp.Body.ID = task.ID
		resp.Body.ProjectID = task.ProjectID
		resp.Body.Title = task.Title
		resp.Body.Description = task.Description
		resp.Body.StatusID = task.StatusID
		resp.Body.AssignedTo = task.AssignedTo
		resp.Body.DueDate = task.DueDate
		resp.Body.CreatedBy = task.CreatedBy
		resp.Body.CreatedAt = task.CreatedAt.Format("2006-01-02T15:04:05Z")
		resp.Body.UpdatedAt = task.UpdatedAt.Format("2006-01-02T15:04:05Z")
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "deleteTask",
		Method:      http.MethodDelete,
		Path:        "/api/projects/{projectId}/tasks/{taskId}",
		Summary:     "Delete a task",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Tasks"},
	}, func(ctx context.Context, input *DeleteTaskInput) (*struct{}, error) {
		claims := middleware.GetClaims(ctx)
		if claims == nil {
			return nil, huma.Error401Unauthorized("unauthorized")
		}

		projectID, _ := uuid.Parse(input.ProjectID)
		taskID, _ := uuid.Parse(input.TaskID)

		result := db.Gorm.Where("id = ? AND project_id = ?", taskID, projectID).Delete(&models.Task{})
		if result.RowsAffected == 0 {
			return nil, huma.Error404NotFound("task not found")
		}

		hub.Broadcast(projectID, &ws.Message{
			Type:      "taskDeleted",
			ProjectID: projectID,
			Data:      map[string]string{"id": input.TaskID},
			UserID:    claims.UserID,
		})

		return nil, nil
	})
}
