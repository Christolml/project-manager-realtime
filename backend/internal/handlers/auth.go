package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/anomalyco/project-manager/internal/auth"
	"github.com/anomalyco/project-manager/internal/database"
	"github.com/anomalyco/project-manager/internal/models"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type RegisterInput struct {
	Body struct {
		Username string `json:"username" minLength:"3" maxLength:"50"`
		Email    string `json:"email" format:"email"`
		Password string `json:"password" minLength:"6"`
	}
}

type AuthOutput struct {
	Body struct {
		Token    string `json:"token"`
		UserID   string `json:"userId"`
		Username string `json:"username"`
	}
}

type LoginInput struct {
	Body struct {
		Email    string `json:"email" format:"email"`
		Password string `json:"password"`
	}
}

func RegisterAuthRoutes(api huma.API, db *database.DB, jwtSecret string) {
	huma.Register(api, huma.Operation{
		OperationID: "register",
		Method:      http.MethodPost,
		Path:        "/api/auth/register",
		Summary:     "Register a new user",
		Tags:        []string{"Auth"},
	}, func(ctx context.Context, input *RegisterInput) (*AuthOutput, error) {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Body.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to hash password")
		}

		user := &models.User{
			Username: input.Body.Username,
			Email:    input.Body.Email,
			Password: string(hashedPassword),
		}

		if result := db.Gorm.Create(user); result.Error != nil {
			return nil, huma.Error409Conflict("username or email already exists")
		}

		token, err := auth.GenerateToken(user.ID, user.Username, jwtSecret)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to generate token")
		}

		resp := &AuthOutput{}
		resp.Body.Token = token
		resp.Body.UserID = user.ID.String()
		resp.Body.Username = user.Username
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "login",
		Method:      http.MethodPost,
		Path:        "/api/auth/login",
		Summary:     "Login with email and password",
		Tags:        []string{"Auth"},
	}, func(ctx context.Context, input *LoginInput) (*AuthOutput, error) {
		var user models.User
		if result := db.Gorm.Where("email = ?", input.Body.Email).First(&user); result.Error != nil {
			return nil, huma.Error401Unauthorized("invalid email or password")
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Body.Password)); err != nil {
			return nil, huma.Error401Unauthorized("invalid email or password")
		}

		token, err := auth.GenerateToken(user.ID, user.Username, jwtSecret)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to generate token")
		}

		resp := &AuthOutput{}
		resp.Body.Token = token
		resp.Body.UserID = user.ID.String()
		resp.Body.Username = user.Username
		return resp, nil
	})
}

func resolveAuth(authHeader string, jwtSecret string) (*auth.Claims, error) {
	if authHeader == "" {
		return nil, huma.Error401Unauthorized("missing authorization header")
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, huma.Error401Unauthorized("invalid authorization format")
	}
	claims, err := auth.ValidateToken(parts[1], jwtSecret)
	if err != nil {
		return nil, huma.Error401Unauthorized("invalid or expired token")
	}
	return claims, nil
}

func mustParseUUID(s string) (uuid.UUID, error) {
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, huma.Error400BadRequest("invalid id: " + s)
	}
	return id, nil
}
