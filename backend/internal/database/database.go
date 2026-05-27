package database

import (
	"log"

	"github.com/anomalyco/project-manager/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type DB struct {
	Gorm *gorm.DB
}

func Connect(dsn string) *DB {
	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	err = gormDB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.ProjectMember{},
		&models.TaskStatus{},
		&models.Task{},
	)
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	return &DB{Gorm: gormDB}
}
