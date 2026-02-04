package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/plata-mia/xx-proxy/internal/storage"
	"github.com/plata-mia/xx-proxy/internal/xxclient"
)

type Router struct {
	engine   *gin.Engine
	handlers *Handlers
}

type RouterConfig struct {
	CORSOrigins      []string
	AnnounceRateLimit float64 // requests per second for /announce endpoint
}

func NewRouter(
	cfg RouterConfig,
	store *storage.Store,
	client *xxclient.Client,
	channel *xxclient.BroadcastChannel,
) *Router {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery())
	engine.Use(gin.Logger())

	corsConfig := cors.DefaultConfig()
	if len(cfg.CORSOrigins) > 0 {
		corsConfig.AllowOrigins = cfg.CORSOrigins
	}
	corsConfig.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	engine.Use(cors.New(corsConfig))

	handlers := NewHandlers(store, client, channel)

	rateLimit := cfg.AnnounceRateLimit
	if rateLimit <= 0 {
		rateLimit = 10 // default: 10 requests/second
	}
	announceLimiter := NewRateLimiter(rateLimit)

	engine.GET("/health", handlers.Health)
	engine.GET("/announcements", handlers.GetAnnouncements)
	engine.POST("/announce", RateLimitMiddleware(announceLimiter), handlers.PostAnnounce)

	return &Router{
		engine:   engine,
		handlers: handlers,
	}
}

func (r *Router) Run(addr string) error {
	return r.engine.Run(addr)
}

func (r *Router) Engine() *gin.Engine {
	return r.engine
}
