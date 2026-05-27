package handlers

import (
	"context"
	"net/http"

	"github.com/anomalyco/project-manager/internal/database"
	"github.com/anomalyco/project-manager/internal/models"
	ws "github.com/anomalyco/project-manager/internal/websocket"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

type InviteMemberInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	Body struct {
		Email string `json:"email" format:"email"`
	}
}

type RemoveMemberInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
	UserID        string `path:"userId"`
}

type ListMembersInput struct {
	Authorization string `header:"Authorization"`
	ProjectID     string `path:"projectId"`
}

type MemberOutput struct {
	Body struct {
		UserID   uuid.UUID `json:"userId"`
		Username string    `json:"username"`
		Email    string    `json:"email"`
		Role     string    `json:"role"`
	}
}

type ListMembersOutput struct {
	Body []struct {
		UserID   uuid.UUID `json:"userId"`
		Username string    `json:"username"`
		Email    string    `json:"email"`
		Role     string    `json:"role"`
	}
}

func RegisterMemberRoutes(api huma.API, db *database.DB, hub *ws.Hub, jwtSecret string) {
	huma.Register(api, huma.Operation{
		OperationID: "inviteMember",
		Method:      http.MethodPost,
		Path:        "/api/projects/{projectId}/members",
		Summary:     "Invite a user to a project by email",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Members"},
	}, func(ctx context.Context, input *InviteMemberInput) (*MemberOutput, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, err := mustParseUUID(input.ProjectID)
		if err != nil {
			return nil, err
		}

		var project models.Project
		if result := db.Gorm.First(&project, "id = ?", projectID); result.Error != nil {
			return nil, huma.Error404NotFound("project not found")
		}

		if project.OwnerID != claims.UserID {
			var isAdmin int64
			db.Gorm.Model(&models.ProjectMember{}).
				Where("project_id = ? AND user_id = ? AND role = ?", projectID, claims.UserID, "admin").
				Count(&isAdmin)
			if isAdmin == 0 {
				return nil, huma.Error403Forbidden("only project admins can invite members")
			}
		}

		var invitedUser models.User
		if result := db.Gorm.Where("email = ?", input.Body.Email).First(&invitedUser); result.Error != nil {
			return nil, huma.Error404NotFound("user with that email not found")
		}

		var existing int64
		db.Gorm.Model(&models.ProjectMember{}).
			Where("project_id = ? AND user_id = ?", projectID, invitedUser.ID).
			Count(&existing)
		if existing > 0 {
			return nil, huma.Error409Conflict("user is already a member of this project")
		}

		member := &models.ProjectMember{
			ProjectID: projectID,
			UserID:    invitedUser.ID,
			Role:      "member",
		}
		db.Gorm.Create(member)

		resp := &MemberOutput{}
		resp.Body.UserID = invitedUser.ID
		resp.Body.Username = invitedUser.Username
		resp.Body.Email = invitedUser.Email
		resp.Body.Role = "member"

		hub.Broadcast(projectID, &ws.Message{
			Type:      "memberJoined",
			ProjectID: projectID,
			Data:      resp.Body,
			UserID:    claims.UserID,
		})

		hub.SendToUser(invitedUser.ID, &ws.Message{
			Type:      "projectInvited",
			ProjectID: projectID,
			Data: map[string]string{
				"projectId":   projectID.String(),
				"projectName": project.Name,
			},
			UserID: claims.UserID,
		})

		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "listMembers",
		Method:      http.MethodGet,
		Path:        "/api/projects/{projectId}/members",
		Summary:     "List project members",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Members"},
	}, func(ctx context.Context, input *ListMembersInput) (*ListMembersOutput, error) {
		_, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, _ := uuid.Parse(input.ProjectID)

		var project models.Project
		db.Gorm.First(&project, "id = ?", projectID)

		var members []models.ProjectMember
		db.Gorm.Where("project_id = ?", projectID).
			Preload("User").
			Find(&members)

		resp := &ListMembersOutput{}
		for _, m := range members {
			role := m.Role
			if m.UserID == project.OwnerID {
				role = "admin"
			}
			resp.Body = append(resp.Body, struct {
				UserID   uuid.UUID `json:"userId"`
				Username string    `json:"username"`
				Email    string    `json:"email"`
				Role     string    `json:"role"`
			}{
				UserID:   m.UserID,
				Username: m.User.Username,
				Email:    m.User.Email,
				Role:     role,
			})
		}
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "removeMember",
		Method:      http.MethodDelete,
		Path:        "/api/projects/{projectId}/members/{userId}",
		Summary:     "Remove a member from a project",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Members"},
	}, func(ctx context.Context, input *RemoveMemberInput) (*struct{}, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, _ := uuid.Parse(input.ProjectID)
		userID, _ := uuid.Parse(input.UserID)

		var project models.Project
		if result := db.Gorm.First(&project, "id = ?", projectID); result.Error != nil {
			return nil, huma.Error404NotFound("project not found")
		}

		if project.OwnerID == userID {
			return nil, huma.Error403Forbidden("cannot remove the project owner")
		}

		if project.OwnerID != claims.UserID {
			var isAdmin int64
			db.Gorm.Model(&models.ProjectMember{}).
				Where("project_id = ? AND user_id = ? AND role = ?", projectID, claims.UserID, "admin").
				Count(&isAdmin)
			if isAdmin == 0 {
				return nil, huma.Error403Forbidden("only project admins can remove members")
			}
		}

		result := db.Gorm.Where("project_id = ? AND user_id = ?", projectID, userID).Delete(&models.ProjectMember{})
		if result.RowsAffected == 0 {
			return nil, huma.Error404NotFound("member not found")
		}

		hub.Broadcast(projectID, &ws.Message{
			Type:      "memberRemoved",
			ProjectID: projectID,
			Data:      map[string]string{"userId": input.UserID},
			UserID:    claims.UserID,
		})

		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "leaveProject",
		Method:      http.MethodPost,
		Path:        "/api/projects/{projectId}/leave",
		Summary:     "Leave a project",
		Security:    []map[string][]string{{"bearerAuth": {}}},
		Tags:        []string{"Members"},
	}, func(ctx context.Context, input *struct {
		Authorization string `header:"Authorization"`
		ProjectID     string `path:"projectId"`
	}) (*struct{}, error) {
		claims, err := resolveAuth(input.Authorization, jwtSecret)
		if err != nil {
			return nil, err
		}

		projectID, _ := uuid.Parse(input.ProjectID)

		var project models.Project
		if result := db.Gorm.First(&project, "id = ?", projectID); result.Error != nil {
			return nil, huma.Error404NotFound("project not found")
		}

		if project.OwnerID == claims.UserID {
			return nil, huma.Error403Forbidden("owner cannot leave project, delete it instead")
		}

		result := db.Gorm.Where("project_id = ? AND user_id = ?", projectID, claims.UserID).Delete(&models.ProjectMember{})
		if result.RowsAffected == 0 {
			return nil, huma.Error404NotFound("you are not a member of this project")
		}

		hub.Broadcast(projectID, &ws.Message{
			Type:      "memberRemoved",
			ProjectID: projectID,
			Data:      map[string]string{"userId": claims.UserID.String()},
			UserID:    claims.UserID,
		})

		return nil, nil
	})
}
