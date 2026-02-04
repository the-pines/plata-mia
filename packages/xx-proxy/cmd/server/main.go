package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/plata-mia/xx-proxy/internal/api"
	"github.com/plata-mia/xx-proxy/internal/config"
	"github.com/plata-mia/xx-proxy/internal/storage"
	"github.com/plata-mia/xx-proxy/internal/xxclient"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Starting xx-proxy server...")

	cfg := config.Load()

	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	channelPrint := loadChannelFile(cfg.ChannelFile)
	if channelPrint != "" {
		cfg.ChannelPrint = channelPrint
		log.Println("Loaded channel from file")
	}

	store := storage.NewStore(cfg.DataPath)
	if err := store.Load(); err != nil {
		log.Printf("Warning: failed to load announcements: %v", err)
	} else {
		log.Printf("Loaded %d announcements from storage", store.Count())
	}

	clientCfg := xxclient.ClientConfig{
		NDFURL:     cfg.NDFURL,
		CertPath:   cfg.CertPath,
		SessionDir: cfg.SessionDir,
		Password:   cfg.Password,
	}

	log.Println("Initializing cMix client...")
	client, err := xxclient.NewClient(clientCfg)
	if err != nil {
		log.Fatalf("Failed to create cMix client: %v", err)
	}

	log.Println("Starting network follower...")
	if err := client.Start(); err != nil {
		log.Fatalf("Failed to start network follower: %v", err)
	}

	log.Println("Waiting for network to become healthy...")
	if err := client.WaitForHealthy(2 * time.Minute); err != nil {
		log.Printf("Warning: %v - continuing anyway", err)
	} else {
		log.Println("Network is healthy")
	}

	channelCfg := xxclient.ChannelConfig{
		Name:        cfg.ChannelName,
		Description: cfg.ChannelDesc,
		PrettyPrint: cfg.ChannelPrint,
	}

	log.Println("Setting up broadcast channel...")
	channel, err := xxclient.NewBroadcastChannel(client, channelCfg, client.GetRng())
	if err != nil {
		log.Fatalf("Failed to create broadcast channel: %v", err)
	}

	if cfg.ChannelPrint == "" {
		prettyPrint := channel.PrettyPrint()
		log.Println("New channel created. PrettyPrint for sharing:")
		log.Println(prettyPrint)
		if err := saveChannelFile(cfg.ChannelFile, prettyPrint); err != nil {
			log.Printf("Warning: failed to save channel file: %v", err)
		}
	}

	listener := xxclient.NewListener(store, channel)
	if err := listener.Start(); err != nil {
		log.Fatalf("Failed to start listener: %v", err)
	}
	log.Println("Listener started")

	routerCfg := api.RouterConfig{
		CORSOrigins: cfg.CORSOrigins,
	}
	router := api.NewRouter(routerCfg, store, client, channel)

	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:    addr,
		Handler: router.Engine(),
	}

	go func() {
		log.Printf("HTTP server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}

	channel.Stop()
	client.Stop()

	log.Println("Server stopped")
}

func loadChannelFile(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func saveChannelFile(path, prettyPrint string) error {
	return os.WriteFile(path, []byte(prettyPrint), 0600)
}
