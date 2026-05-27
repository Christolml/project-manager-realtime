package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Username  string         `gorm:"uniqueIndex;not null;size:50" json:"username"`
	Email     string         `gorm:"uniqueIndex;not null;size:255" json:"email"`
	Password  string         `gorm:"not null" json:"-"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type Project struct {
	ID          uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string          `gorm:"not null;size:100" json:"name"`
	Description string          `gorm:"size:500" json:"description"`
	OwnerID     uuid.UUID       `gorm:"type:uuid;not null;index" json:"ownerId"`
	Owner       User            `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Members     []ProjectMember `gorm:"foreignKey:ProjectID" json:"members,omitempty"`
	Statuses    []TaskStatus    `gorm:"foreignKey:ProjectID" json:"statuses,omitempty"`
	Tasks       []Task          `gorm:"foreignKey:ProjectID" json:"tasks,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type ProjectMember struct {
	ProjectID uuid.UUID `gorm:"type:uuid;primaryKey" json:"projectId"`
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"userId"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role      string    `gorm:"default:member;size:20" json:"role"`
}

type TaskStatus struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID uuid.UUID `gorm:"type:uuid;not null;index" json:"projectId"`
	Name      string    `gorm:"not null;size:50" json:"name"`
	Color     string    `gorm:"default:#6B7280;size:7" json:"color"`
	Order     int       `gorm:"default:0" json:"order"`
	CreatedAt time.Time `json:"createdAt"`
}

func (ts *TaskStatus) BeforeCreate(tx *gorm.DB) error {
	if ts.ID == uuid.Nil {
		ts.ID = uuid.New()
	}
	return nil
}

type Task struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"projectId"`
	Title       string     `gorm:"not null;size:200" json:"title"`
	Description string     `gorm:"size:2000" json:"description"`
	StatusID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"statusId"`
	Status      TaskStatus `gorm:"foreignKey:StatusID" json:"status,omitempty"`
	AssignedTo  *uuid.UUID `gorm:"type:uuid" json:"assignedTo"`
	Assignee    *User      `gorm:"foreignKey:AssignedTo" json:"assignee,omitempty"`
	DueDate     *time.Time `json:"dueDate"`
	CreatedBy   uuid.UUID  `gorm:"type:uuid;not null" json:"createdBy"`
	Creator     User       `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
