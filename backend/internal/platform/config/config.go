package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Environment           string
	HTTPAddr              string
	DatabaseURL           string
	AllowInMemoryFallback bool
	JWTSecret             string
	CORSAllowedOrigins    []string
	LogLevel              slog.Level
	AIProvider            string
	AIModel               string
	AIStoreResponses      bool
	AITimeoutSeconds      int
	AIMessagesPerMinute   int
	AIDailyMessageLimit   int
	AIRetentionDays       int
	AIUseLLM              bool
}

func Load() Config {
	return Config{
		Environment:           getEnv("APP_ENV", "development"),
		HTTPAddr:              getEnv("HTTP_ADDR", ":8080"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://ots:ots@localhost:5432/ots?sslmode=disable"),
		AllowInMemoryFallback: getEnv("ALLOW_IN_MEMORY_FALLBACK", "false") == "true",
		JWTSecret:             getEnv("JWT_SECRET", "ots-dev-jwt-secret-change-in-production"),
		CORSAllowedOrigins:    splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006,http://panel.ogtasis.com,https://panel.ogtasis.com,http://188.132.234.29:3110,http://188.132.234.29")),
		LogLevel:              parseLogLevel(getEnv("LOG_LEVEL", "info")),
		AIProvider:            getEnv("OGTA_AI_PROVIDER", "openai"),
		AIModel:               getEnv("OGTA_AI_MODEL", "gpt-4o-mini"),
		AIStoreResponses:      getEnv("OGTA_AI_STORE_RESPONSES", "false") == "true",
		AITimeoutSeconds:      parseInt(getEnv("OGTA_AI_TIMEOUT_SECONDS", "30"), 30),
		AIMessagesPerMinute:   parseInt(getEnv("OGTA_AI_MESSAGES_PER_MINUTE", "20"), 20),
		AIDailyMessageLimit:   parseInt(getEnv("OGTA_AI_DAILY_MESSAGE_LIMIT", "200"), 200),
		AIRetentionDays:       parseInt(getEnv("OGTA_AI_RETENTION_DAYS", "90"), 90),
		AIUseLLM:              getEnv("OGTA_AI_USE_LLM", "true") == "true",
	}
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func parseInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return parsed
}

func parseLogLevel(value string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
