package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	guardianapp "ots/backend/internal/app/guardian"
	identityapp "ots/backend/internal/app/identity"
	observationapp "ots/backend/internal/app/observation"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	superadminapp "ots/backend/internal/app/superadmin"
	httphandlers "ots/backend/internal/http/handlers"
	"ots/backend/internal/http/middleware"
	platformauth "ots/backend/internal/platform/auth"
	"ots/backend/internal/platform/config"
	"ots/backend/internal/repository/memory"
	"ots/backend/internal/repository/postgres"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	jwtIssuer := platformauth.NewJWT(cfg.JWTSecret, 8*time.Hour, 7*24*time.Hour)

	memoryStore := memory.NewStore(time.Now)
	identityRepo := identityapp.Repository(memoryStore)
	superAdminRepo := superadminapp.Repository(memoryStore)

	var schoolRepo schoolapp.Repository = memoryStore
	var schedulingRepo schedulingapp.Repository = memoryStore
	var dashboardRepo dashboardapp.Repository = memoryStore
	var observationRepo observationapp.Repository = memoryStore
	var attendanceRepo attendanceapp.Repository = memoryStore
	var guardianRepo guardianapp.Repository = memoryStore

	postgresStore, err := postgres.NewStore(context.Background(), cfg.DatabaseURL, time.Now)
	if err != nil {
		if cfg.Environment == "production" {
			logger.Error("postgres connection failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
		logger.Warn("postgres unavailable, using in-memory repository", slog.String("error", err.Error()))
	} else {
		defer func() {
			if err := postgresStore.Close(); err != nil {
				logger.Warn("postgres close failed", slog.String("error", err.Error()))
			}
		}()
		identityRepo = postgresStore
		superAdminRepo = postgresStore
		schoolRepo = postgresStore
		schedulingRepo = postgresStore
		dashboardRepo = postgresStore
		observationRepo = postgresStore
		attendanceRepo = postgresStore
		guardianRepo = postgresStore
		logger.Info("postgres repository connected")
	}

	handlers := httphandlers.New(httphandlers.Dependencies{
		Identity:    identityapp.NewService(identityRepo, jwtIssuer, time.Now),
		School:      schoolapp.NewService(schoolRepo),
		Scheduling:  schedulingapp.NewService(schedulingRepo),
		Attendance:  attendanceapp.NewService(attendanceRepo),
		Observation: observationapp.NewService(observationRepo),
		Guardian:    guardianapp.NewService(guardianRepo),
		Dashboard:   dashboardapp.NewService(dashboardRepo),
		SuperAdmin:  superadminapp.NewService(superAdminRepo),
		Clock:       time.Now,
	})

	mux := http.NewServeMux()
	handlers.Register(mux)

	stack := middleware.Chain(
		middleware.Recoverer(logger),
		middleware.RequestID(),
		middleware.Logger(logger),
		middleware.CORS(cfg.CORSAllowedOrigins),
		middleware.JWTAuth(jwtIssuer),
	)

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           stack(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	logger.Info("api server starting", slog.String("addr", cfg.HTTPAddr), slog.String("env", cfg.Environment))
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("api server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
