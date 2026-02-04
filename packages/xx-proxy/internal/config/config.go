package config

import (
	"errors"
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
	ChannelFile  string // File path to persist channel PrettyPrint
	DataPath     string // Directory for persistent data (announcements)
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
		ChannelName:  getEnv("XX_CHANNEL_NAME", "platamiaannouncements"),
		ChannelDesc:  getEnv("XX_CHANNEL_DESC", "Stealth payment announcement channel"),
		ChannelPrint: getEnv("XX_CHANNEL_PRINT", ""),
		ChannelFile:  getEnv("XX_CHANNEL_FILE", "./channel.txt"),
		DataPath:     getEnv("XX_DATA_PATH", "./data"),
		Port:         getEnv("PORT", "8080"),
		CORSOrigins:  origins,
		LogLevel:     logLevel,
	}
}

func (c *Config) Validate() error {
	if c.CertPath == "" {
		return errors.New("XX_CERT_PATH is required")
	}
	if _, err := os.Stat(c.CertPath); os.IsNotExist(err) {
		return errors.New("XX_CERT_PATH file does not exist: " + c.CertPath)
	}
	if c.Password == "" {
		return errors.New("XX_PASSWORD is required")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
