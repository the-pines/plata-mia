package api

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type RateLimiter struct {
	mu       sync.Mutex
	tokens   float64
	maxRate  float64
	interval time.Duration
	lastTime time.Time
}

func NewRateLimiter(requestsPerSecond float64) *RateLimiter {
	return &RateLimiter{
		tokens:   requestsPerSecond,
		maxRate:  requestsPerSecond,
		interval: time.Second,
		lastTime: time.Now(),
	}
}

func (r *RateLimiter) Allow() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(r.lastTime).Seconds()
	r.lastTime = now

	r.tokens += elapsed * r.maxRate
	if r.tokens > r.maxRate {
		r.tokens = r.maxRate
	}

	if r.tokens < 1 {
		return false
	}

	r.tokens--
	return true
}

func RateLimitMiddleware(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   "rate limit exceeded",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
