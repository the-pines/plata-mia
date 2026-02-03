package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	NDFURL       string
	CertPath     string
	SessionDir   string
	Password     string
	ChannelName  string
	ChannelDesc  string
	ChannelPrint string // Pre-generated channel PrettyPrint (Option A from plan)
	Port         string
	CORSOrigins  []string
	LogLevel     int
}

func Load() *Config {
	logLevel := 1
	if lvl, err := strconv.Atoi(getEnv("LOG_LEVEL", "1")); err == nil {
		logLevel = lvl
	}

	origins := strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	return &Config{
		NDFURL:       getEnv("XX_NDF_URL", "https://elixxir-bins.s3.us-west-1.amazonaws.com/ndf/mainnet.json"),
		CertPath:     getEnv("XX_CERT_PATH", ""),
		SessionDir:   getEnv("XX_SESSION_DIR", "./xx-session"),
		Password:     getEnv("XX_PASSWORD", ""),
		ChannelName:  getEnv("XX_CHANNEL_NAME", "plata-mia-announcements"),
		ChannelDesc:  getEnv("XX_CHANNEL_DESC", "Stealth payment announcement channel"),
		ChannelPrint: getEnv("XX_CHANNEL_PRINT", ""),
		Port:         getEnv("PORT", "8080"),
		CORSOrigins:  origins,
		LogLevel:     logLevel,
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
