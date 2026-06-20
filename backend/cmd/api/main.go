package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	academicapp "ots/backend/internal/app/academic"
	aiapp "ots/backend/internal/app/ai"
	announcementapp "ots/backend/internal/app/announcement"
	attendanceapp "ots/backend/internal/app/attendance"
	billingapp "ots/backend/internal/app/billing"
	dashboardapp "ots/backend/internal/app/dashboard"
	guardianapp "ots/backend/internal/app/guardian"
	guidanceapp "ots/backend/internal/app/guidance"
	homeworkapp "ots/backend/internal/app/homework"
	identityapp "ots/backend/internal/app/identity"
	lifeapp "ots/backend/internal/app/life"
	observationapp "ots/backend/internal/app/observation"
	pushapp "ots/backend/internal/app/push"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	studentimportapp "ots/backend/internal/app/studentimport"
	superadminapp "ots/backend/internal/app/superadmin"
	transportapp "ots/backend/internal/app/transport"
	httphandlers "ots/backend/internal/http/handlers"
	"ots/backend/internal/http/middleware"
	platformauth "ots/backend/internal/platform/auth"
	"ots/backend/internal/platform/config"
	"ots/backend/internal/platform/openai"
	platformpush "ots/backend/internal/platform/push"
	"ots/backend/internal/platform/storage"
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
	var academicRepo academicapp.Repository = memoryStore
	var dashboardRepo dashboardapp.Repository = memoryStore
	var observationRepo observationapp.Repository = memoryStore
	var attendanceRepo attendanceapp.Repository = memoryStore
	var guardianRepo guardianapp.Repository = memoryStore
	var guidanceRepo guidanceapp.Repository = memoryStore
	var aiRepo aiapp.Repository = memoryStore
	var billingRepo billingapp.Repository = memoryStore
	var transportRepo transportapp.Repository = memoryStore
	var lifeRepo lifeapp.Repository = memoryStore
	var pushRepo pushapp.Repository = memoryStore
	var announcementRepo announcementapp.Repository = memoryStore
	var studentImportRepo studentimportapp.Repository = memoryStore
	var auditWriter middleware.AuditWriter = memoryStore.RecordOperationalAudit
	var homeworkRepo homeworkapp.Repository = memory.NewSeededHomeworkStore(memoryStore, time.Now)

	postgresStore, err := postgres.NewStore(context.Background(), cfg.DatabaseURL, time.Now)
	if err != nil {
		if cfg.Environment == "production" || !cfg.AllowInMemoryFallback {
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
		academicRepo = postgresStore
		dashboardRepo = postgresStore
		observationRepo = postgresStore
		attendanceRepo = postgresStore
		guardianRepo = postgresStore
		guidanceRepo = postgresStore
		aiRepo = postgresStore
		billingRepo = postgresStore
		transportRepo = postgresStore
		lifeRepo = postgresStore
		pushRepo = postgresStore
		announcementRepo = postgresStore
		studentImportRepo = postgresStore
		homeworkRepo = postgresStore
		auditWriter = postgresStore.RecordOperationalAudit
		logger.Info("postgres repository connected")
	}

	schoolService := schoolapp.NewService(schoolRepo)
	academicService := academicapp.NewService(academicRepo, time.Now)
	observationService := observationapp.NewService(observationRepo)
	openAIClient := openai.NewHTTPClient(openai.Config{
		APIKey:        os.Getenv("OPENAI_API_KEY"),
		Model:         cfg.AIModel,
		StoreResponse: cfg.AIStoreResponses,
		Timeout:       time.Duration(cfg.AITimeoutSeconds) * time.Second,
	})
	aiService := aiapp.NewService(aiapp.Dependencies{
		Repo:         aiRepo,
		School:       schoolService,
		Observation:  observationService,
		Guidance:     guidanceapp.NewService(guidanceRepo),
		Dashboard:    dashboardapp.NewService(dashboardRepo),
		Guardian:     guardianapp.NewService(guardianRepo),
		SuperAdmin:   superadminapp.NewService(superAdminRepo),
		Attendance:   attendanceapp.NewService(attendanceRepo),
		Scheduling:   schedulingapp.NewService(schedulingRepo),
		OpenAI:       openAIClient,
		EnvOpenAIKey: os.Getenv("OPENAI_API_KEY"),
		Clock:        time.Now,
		Config: aiapp.Config{
			Model:             cfg.AIModel,
			StoreResponse:     cfg.AIStoreResponses,
			DailyMessageLimit: cfg.AIDailyMessageLimit,
			RetentionDays:     cfg.AIRetentionDays,
			UseLLM:            cfg.AIUseLLM,
		},
	})

	homeworkService := homeworkapp.NewService(homeworkRepo, time.Now)
	billingService := billingapp.NewService(billingRepo, time.Now)
	transportService := transportapp.NewService(transportRepo, time.Now)
	lifeService := lifeapp.NewService(lifeRepo, time.Now)
	var pushSender platformpush.Sender = platformpush.NewExpoSender(os.Getenv("EXPO_ACCESS_TOKEN"), logger)
	if strings.TrimSpace(os.Getenv("EXPO_PUSH_ENABLED")) == "false" {
		pushSender = platformpush.NewNoopSender(logger)
	}
	pushService := pushapp.NewService(pushRepo, pushSender)
	announcementService := announcementapp.NewService(announcementRepo, time.Now)
	studentImportService := studentimportapp.NewService(studentImportRepo, time.Now)
	var fileRegistry storage.FileRegistry
	if postgresStore != nil {
		fileRegistry = postgresStore
	}
	fileStorage := storage.NewLocal(storage.LocalConfig{
		BaseDir:        cfg.FileStoragePath,
		BaseURL:        cfg.FileStorageBaseURL,
		MaxUploadBytes: int64(cfg.FileUploadMaxMB) << 20,
		Registry:       fileRegistry,
	})

	handlers := httphandlers.New(httphandlers.Dependencies{
		Identity:      identityapp.NewService(identityRepo, jwtIssuer, time.Now),
		School:        schoolService,
		Scheduling:    schedulingapp.NewService(schedulingRepo),
		Academic:      academicService,
		Attendance:    attendanceapp.NewService(attendanceRepo),
		Observation:   observationService,
		Guardian:      guardianapp.NewService(guardianRepo),
		Guidance:      guidanceapp.NewService(guidanceRepo),
		Homework:      homeworkService,
		Dashboard:     dashboardapp.NewService(dashboardRepo),
		SuperAdmin:    superadminapp.NewService(superAdminRepo),
		Billing:       billingService,
		Transport:     transportService,
		Life:          lifeService,
		AI:            aiService,
		Push:          pushService,
		Announcements: announcementService,
		StudentImport: studentImportService,
		FileStorage:   fileStorage,
		Clock:         time.Now,
	})

	go func() {
		run := func() {
			if _, err := aiService.RunRetentionAll(context.Background()); err != nil {
				logger.Warn("ai retention job failed", slog.String("error", err.Error()))
			}
		}
		run()
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()

	go func() {
		runGuidance := func() {
			pushService.RunGuidanceRemindersAllTenants(context.Background())
		}
		runGuidance()
		guidanceTicker := time.NewTicker(12 * time.Hour)
		defer guidanceTicker.Stop()
		for range guidanceTicker.C {
			runGuidance()
		}
	}()

	go func() {
		runPrincipalAttendance := func() {
			pushService.RunPrincipalAttendanceRemindersAllTenants(context.Background())
		}
		runPrincipalAttendance()
		attendanceTicker := time.NewTicker(2 * time.Hour)
		defer attendanceTicker.Stop()
		for range attendanceTicker.C {
			runPrincipalAttendance()
		}
	}()

	go func() {
		runBilling := func() {
			pushService.RunBillingRemindersAllTenants(context.Background())
		}
		runBilling()
		billingTicker := time.NewTicker(24 * time.Hour)
		defer billingTicker.Stop()
		for range billingTicker.C {
			runBilling()
		}
	}()

	go func() {
		runScheduled := func() {
			published, err := announcementService.PublishDueScheduled(context.Background())
			if err != nil {
				logger.Warn("scheduled announcement job failed", slog.String("error", err.Error()))
				return
			}
			for _, item := range published {
				userIDs, resolveErr := announcementService.ResolveTargetUserIDs(context.Background(), item.TenantID, item.Audiences)
				if resolveErr != nil {
					continue
				}
				pushService.NotifyAnnouncementToUsers(context.Background(), item.TenantID, item.ID, item.Title, item.Body, userIDs)
			}
		}
		runScheduled()
		announcementTicker := time.NewTicker(5 * time.Minute)
		defer announcementTicker.Stop()
		for range announcementTicker.C {
			runScheduled()
		}
	}()

	mux := http.NewServeMux()
	handlers.Register(mux)

	middlewares := []middleware.Middleware{
		middleware.Recoverer(logger),
		middleware.RequestID(),
		middleware.Logger(logger),
		middleware.CORS(cfg.CORSAllowedOrigins),
		middleware.JWTAuth(jwtIssuer),
		middleware.AIRateLimit(cfg.AIMessagesPerMinute),
	}
	if postgresStore != nil {
		middlewares = append(middlewares,
			middleware.UserScopes(postgresStore),
		)
	}
	middlewares = append(middlewares, middleware.OperationalAudit(auditWriter))
	stack := middleware.Chain(middlewares...)

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
