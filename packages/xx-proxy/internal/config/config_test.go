package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	os.Clearenv()

	cfg := Load()

	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %s", cfg.Port)
	}

	if cfg.LogLevel != 1 {
		t.Errorf("expected default log level 1, got %d", cfg.LogLevel)
	}

	if cfg.ChannelName != "plata-mia-announcements" {
		t.Errorf("expected default channel name, got %s", cfg.ChannelName)
	}

	if len(cfg.CORSOrigins) != 1 || cfg.CORSOrigins[0] != "http://localhost:3000" {
		t.Errorf("expected default CORS origins, got %v", cfg.CORSOrigins)
	}
}

func TestLoadFromEnv(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("LOG_LEVEL", "3")
	os.Setenv("XX_CHANNEL_NAME", "test-channel")
	os.Setenv("CORS_ORIGINS", "http://a.com, http://b.com")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("LOG_LEVEL")
		os.Unsetenv("XX_CHANNEL_NAME")
		os.Unsetenv("CORS_ORIGINS")
	}()

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.Port)
	}

	if cfg.LogLevel != 3 {
		t.Errorf("expected log level 3, got %d", cfg.LogLevel)
	}

	if cfg.ChannelName != "test-channel" {
		t.Errorf("expected channel name test-channel, got %s", cfg.ChannelName)
	}

	if len(cfg.CORSOrigins) != 2 {
		t.Errorf("expected 2 CORS origins, got %d", len(cfg.CORSOrigins))
	}

	if cfg.CORSOrigins[0] != "http://a.com" || cfg.CORSOrigins[1] != "http://b.com" {
		t.Errorf("unexpected CORS origins: %v", cfg.CORSOrigins)
	}
}

func TestLoadInvalidLogLevel(t *testing.T) {
	os.Setenv("LOG_LEVEL", "invalid")
	defer os.Unsetenv("LOG_LEVEL")

	cfg := Load()

	if cfg.LogLevel != 1 {
		t.Errorf("expected default log level 1 for invalid input, got %d", cfg.LogLevel)
	}
}
