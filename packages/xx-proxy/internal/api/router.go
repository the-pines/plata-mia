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
	CORSOrigins []string
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
	} else {
		corsConfig.AllowAllOrigins = true
	}
	corsConfig.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	engine.Use(cors.New(corsConfig))

	handlers := NewHandlers(store, client, channel)

	engine.GET("/health", handlers.Health)
	engine.GET("/announcements", handlers.GetAnnouncements)
	engine.POST("/announce", handlers.PostAnnounce)

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
