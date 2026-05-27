package main

import (
	"log"
	"net/http"

	"github.com/anomalyco/project-manager/internal/config"
	"github.com/anomalyco/project-manager/internal/database"
	"github.com/anomalyco/project-manager/internal/handlers"
	"github.com/anomalyco/project-manager/internal/middleware"
	ws "github.com/anomalyco/project-manager/internal/websocket"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
)

func main() {
	cfg := config.Load()
	db := database.Connect(cfg.DatabaseURL)
	hub := ws.NewHub()

	r := chi.NewMux()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)

	r.Get("/ws", handlers.WebSocketHandler(hub, cfg.JWTSecret))

	apiConfig := huma.DefaultConfig("Project Manager API", "1.0.0")
	apiConfig.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearerAuth": {
			Type:         "http",
			Scheme:       "bearer",
			BearerFormat: "JWT",
		},
	}

	api := humachi.New(r, apiConfig)
	handlers.RegisterAuthRoutes(api, db, cfg.JWTSecret)

	r.Group(func(sub chi.Router) {
		sub.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		protectedAPI := humachi.New(sub, huma.DefaultConfig("Protected", "1.0.0"))
		handlers.RegisterProjectRoutes(protectedAPI, db)
		handlers.RegisterStatusRoutes(protectedAPI, db)
		handlers.RegisterTaskRoutes(protectedAPI, db, hub)
	})

	addr := ":" + cfg.Port
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
