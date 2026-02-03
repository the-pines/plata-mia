package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/plata-mia/xx-proxy/internal/storage"
)

func init() {
	gin.SetMode(gin.TestMode)
}

type mockClient struct {
	healthy bool
}

func (m *mockClient) IsHealthy() bool {
	return m.healthy
}

type mockChannel struct {
	lastPayload []byte
	lastTags    []string
	broadcastFn func([]byte, []string) error
}

func (m *mockChannel) Broadcast(payload []byte, tags []string) error {
	m.lastPayload = payload
	m.lastTags = tags
	if m.broadcastFn != nil {
		return m.broadcastFn(payload, tags)
	}
	return nil
}

func setupTestHandlers() (*Handlers, *storage.Store, *mockClient, *mockChannel) {
	store := storage.NewStore()
	client := &mockClient{healthy: true}
	channel := &mockChannel{}

	handlers := NewHandlersWithInterfaces(store, client, channel)

	return handlers, store, client, channel
}

func TestHealthEndpoint(t *testing.T) {
	handlers, _, client, _ := setupTestHandlers()

	r := gin.New()
	r.GET("/health", handlers.Health)

	client.healthy = true
	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp HealthResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Status != "healthy" {
		t.Errorf("expected status healthy, got %s", resp.Status)
	}

	if !resp.Connected {
		t.Error("expected connected true")
	}

	client.healthy = false
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Status != "unhealthy" {
		t.Errorf("expected status unhealthy, got %s", resp.Status)
	}
}

func TestGetAnnouncementsEmpty(t *testing.T) {
	handlers, _, _, _ := setupTestHandlers()

	r := gin.New()
	r.GET("/announcements", handlers.GetAnnouncements)

	req, _ := http.NewRequest("GET", "/announcements", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp AnnouncementsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Count != 0 {
		t.Errorf("expected count 0, got %d", resp.Count)
	}

	if len(resp.Announcements) != 0 {
		t.Errorf("expected empty announcements, got %d", len(resp.Announcements))
	}
}

func TestGetAnnouncementsWithData(t *testing.T) {
	handlers, store, _, _ := setupTestHandlers()

	var r [32]byte
	r[0] = 0xab
	store.Add(storage.Announcement{R: r, ViewTag: 5, BlockHint: 999})

	router := gin.New()
	router.GET("/announcements", handlers.GetAnnouncements)

	req, _ := http.NewRequest("GET", "/announcements", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp AnnouncementsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Count != 1 {
		t.Errorf("expected count 1, got %d", resp.Count)
	}

	if resp.Announcements[0].ViewTag != 5 {
		t.Errorf("expected viewTag 5, got %d", resp.Announcements[0].ViewTag)
	}

	if resp.Announcements[0].BlockHint != 999 {
		t.Errorf("expected blockHint 999, got %d", resp.Announcements[0].BlockHint)
	}
}

func TestPostAnnounceValid(t *testing.T) {
	handlers, _, _, channel := setupTestHandlers()

	router := gin.New()
	router.POST("/announce", handlers.PostAnnounce)

	body := `{"r":"0102030405060708091011121314151617181920212223242526272829303132","viewTag":42,"blockHint":123456}`
	req, _ := http.NewRequest("POST", "/announce", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp AnnounceResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if !resp.Success {
		t.Errorf("expected success true, got false: %s", resp.Error)
	}

	if channel.lastPayload == nil {
		t.Error("expected broadcast to be called")
	}

	if len(channel.lastPayload) != storage.WireFormatSize {
		t.Errorf("expected payload size %d, got %d", storage.WireFormatSize, len(channel.lastPayload))
	}
}

func TestPostAnnounceInvalidR(t *testing.T) {
	handlers, _, _, _ := setupTestHandlers()

	router := gin.New()
	router.POST("/announce", handlers.PostAnnounce)

	body := `{"r":"tooshort","viewTag":42,"blockHint":123456}`
	req, _ := http.NewRequest("POST", "/announce", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestPostAnnounceMissingFields(t *testing.T) {
	handlers, _, _, _ := setupTestHandlers()

	router := gin.New()
	router.POST("/announce", handlers.PostAnnounce)

	body := `{"viewTag":42}`
	req, _ := http.NewRequest("POST", "/announce", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}
