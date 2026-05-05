package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	identityapp "ots/backend/internal/app/identity"
	observationapp "ots/backend/internal/app/observation"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	superadminapp "ots/backend/internal/app/superadmin"
	httphandlers "ots/backend/internal/http/handlers"
	"ots/backend/internal/http/middleware"
	"ots/backend/internal/platform/config"
	"ots/backend/internal/repository/memory"
	"ots/backend/internal/repository/postgres"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))

	memoryStore := memory.NewStore(time.Now)
	identityRepo := identityapp.Repository(memoryStore)
	superAdminRepo := superadminapp.Repository(memoryStore)

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
		logger.Info("postgres repository connected")
	}

	handlers := httphandlers.New(httphandlers.Dependencies{
		Identity:    identityapp.NewService(identityRepo, time.Now),
		School:      schoolapp.NewService(memoryStore),
		Scheduling:  schedulingapp.NewService(memoryStore),
		Attendance:  attendanceapp.NewService(memoryStore),
		Observation: observationapp.NewService(memoryStore),
		Dashboard:   dashboardapp.NewService(memoryStore),
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
		middleware.DemoAuth(),
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
