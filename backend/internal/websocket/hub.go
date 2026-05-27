package websocket

import (
	"encoding/json"
	"sync"

	"github.com/google/uuid"
	gorilla "github.com/gorilla/websocket"
)

type Message struct {
	Type      string      `json:"type"`
	ProjectID uuid.UUID   `json:"projectId,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	UserID    uuid.UUID   `json:"userId,omitempty"`
}

type Client struct {
	Conn       *gorilla.Conn
	UserID     uuid.UUID
	Username   string
	ProjectIDs map[uuid.UUID]bool
	mu         sync.Mutex
}

func (c *Client) SendJSON(v interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.WriteJSON(v)
}

type Hub struct {
	clients        map[*Client]bool
	projectClients map[uuid.UUID]map[*Client]bool
	mu             sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:        make(map[*Client]bool),
		projectClients: make(map[uuid.UUID]map[*Client]bool),
	}
}

func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client] = true
}

func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, client)
	for pid := range client.ProjectIDs {
		delete(h.projectClients[pid], client)
	}
}

func (h *Hub) Subscribe(client *Client, projectID uuid.UUID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if client.ProjectIDs == nil {
		client.ProjectIDs = make(map[uuid.UUID]bool)
	}
	client.ProjectIDs[projectID] = true
	if h.projectClients[projectID] == nil {
		h.projectClients[projectID] = make(map[*Client]bool)
	}
	h.projectClients[projectID][client] = true
}

func (h *Hub) Unsubscribe(client *Client, projectID uuid.UUID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(client.ProjectIDs, projectID)
	delete(h.projectClients[projectID], client)
}

func (h *Hub) Broadcast(projectID uuid.UUID, msg *Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.projectClients[projectID] {
		_ = client.SendJSON(msg)
	}
}

func ParseMessage(data []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}
