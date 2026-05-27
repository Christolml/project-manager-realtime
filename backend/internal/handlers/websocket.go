package handlers

import (
	"log"
	"net/http"

	"github.com/anomalyco/project-manager/internal/auth"
	"github.com/anomalyco/project-manager/internal/websocket"
	"github.com/google/uuid"
	gorilla "github.com/gorilla/websocket"
)

var upgrader = gorilla.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WebSocketHandler(hub *websocket.Hub, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			http.Error(w, "missing token", http.StatusUnauthorized)
			return
		}

		claims, err := auth.ValidateToken(tokenStr, jwtSecret)
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("websocket upgrade error: %v", err)
			return
		}

		client := &websocket.Client{
			Conn:       conn,
			UserID:     claims.UserID,
			Username:   claims.Username,
			ProjectIDs: make(map[uuid.UUID]bool),
		}
		hub.Register(client)

		defer func() {
			hub.Unregister(client)
			conn.Close()
		}()

		for {
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				break
			}

			msg, err := websocket.ParseMessage(msgBytes)
			if err != nil {
				continue
			}

			switch msg.Type {
			case "subscribe":
				if pid, ok := msg.Data.(string); ok {
					projectID, err := uuid.Parse(pid)
					if err == nil {
						hub.Subscribe(client, projectID)
					}
				}
			case "unsubscribe":
				if pid, ok := msg.Data.(string); ok {
					projectID, err := uuid.Parse(pid)
					if err == nil {
						hub.Unsubscribe(client, projectID)
					}
				}
			}
		}
	}
}
