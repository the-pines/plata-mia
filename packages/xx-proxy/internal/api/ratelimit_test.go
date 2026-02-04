package api

import (
	"testing"
	"time"
)

func TestRateLimiterAllow(t *testing.T) {
	limiter := NewRateLimiter(5.0) // 5 requests per second

	for i := 0; i < 5; i++ {
		if !limiter.Allow() {
			t.Errorf("request %d should be allowed", i)
		}
	}

	if limiter.Allow() {
		t.Error("6th request should be denied")
	}
}

func TestRateLimiterRefill(t *testing.T) {
	limiter := NewRateLimiter(10.0)

	for i := 0; i < 10; i++ {
		limiter.Allow()
	}

	if limiter.Allow() {
		t.Error("should be denied after exhausting tokens")
	}

	time.Sleep(200 * time.Millisecond)

	if !limiter.Allow() {
		t.Error("should be allowed after refill")
	}
}

func TestRateLimiterMaxTokens(t *testing.T) {
	limiter := NewRateLimiter(5.0)

	time.Sleep(300 * time.Millisecond)

	allowed := 0
	for limiter.Allow() {
		allowed++
		if allowed > 10 {
			break
		}
	}

	if allowed > 5 {
		t.Errorf("tokens should not exceed max rate, got %d", allowed)
	}
}
