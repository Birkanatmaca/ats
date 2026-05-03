package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	observationapp "ots/backend/internal/app/observation"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	httphandlers "ots/backend/internal/http/handlers"
	"ots/backend/internal/http/middleware"
	"ots/backend/internal/platform/config"
	"ots/backend/internal/repository/memory"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))

	store := memory.NewStore(time.Now)

	handlers := httphandlers.New(httphandlers.Dependencies{
		School:      schoolapp.NewService(store),
		Scheduling:  schedulingapp.NewService(store),
		Attendance:  attendanceapp.NewService(store),
		Observation: observationapp.NewService(store),
		Dashboard:   dashboardapp.NewService(store),
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
