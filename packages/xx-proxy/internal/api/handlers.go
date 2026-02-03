package api

import (
	"encoding/hex"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/plata-mia/xx-proxy/internal/storage"
	"github.com/plata-mia/xx-proxy/internal/xxclient"
)

type HealthChecker interface {
	IsHealthy() bool
}

type Broadcaster interface {
	Broadcast(payload []byte, tags []string) error
}

type Handlers struct {
	store       *storage.Store
	healthCheck HealthChecker
	broadcaster Broadcaster
}

func NewHandlers(
	store *storage.Store,
	client *xxclient.Client,
	channel *xxclient.BroadcastChannel,
) *Handlers {
	return &Handlers{
		store:       store,
		healthCheck: client,
		broadcaster: channel,
	}
}

func NewHandlersWithInterfaces(
	store *storage.Store,
	healthCheck HealthChecker,
	broadcaster Broadcaster,
) *Handlers {
	return &Handlers{
		store:       store,
		healthCheck: healthCheck,
		broadcaster: broadcaster,
	}
}

type HealthResponse struct {
	Status    string `json:"status"`
	Connected bool   `json:"connected"`
}

func (h *Handlers) Health(c *gin.Context) {
	healthy := h.healthCheck.IsHealthy()
	status := "unhealthy"
	if healthy {
		status = "healthy"
	}

	c.JSON(http.StatusOK, HealthResponse{
		Status:    status,
		Connected: healthy,
	})
}

type AnnounceRequest struct {
	R         string `json:"r" binding:"required"`
	ViewTag   uint8  `json:"viewTag"`
	BlockHint uint64 `json:"blockHint"`
}

type AnnounceResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func (h *Handlers) PostAnnounce(c *gin.Context) {
	var req AnnounceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, AnnounceResponse{
			Success: false,
			Error:   "invalid request: " + err.Error(),
		})
		return
	}

	rBytes, err := hex.DecodeString(req.R)
	if err != nil || len(rBytes) != 32 {
		c.JSON(http.StatusBadRequest, AnnounceResponse{
			Success: false,
			Error:   "R must be 32 bytes hex encoded (64 characters)",
		})
		return
	}

	var r [32]byte
	copy(r[:], rBytes)

	ann := storage.Announcement{
		R:         r,
		ViewTag:   req.ViewTag,
		BlockHint: req.BlockHint,
	}

	payload := storage.Serialize(ann)

	if err := h.broadcaster.Broadcast(payload, []string{xxclient.AnnouncementTag}); err != nil {
		c.JSON(http.StatusInternalServerError, AnnounceResponse{
			Success: false,
			Error:   "broadcast failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, AnnounceResponse{
		Success: true,
	})
}

type AnnouncementDTO struct {
	R          string `json:"r"`
	ViewTag    uint8  `json:"viewTag"`
	BlockHint  uint64 `json:"blockHint"`
	ReceivedAt int64  `json:"receivedAt"`
}

type AnnouncementsResponse struct {
	Announcements []AnnouncementDTO `json:"announcements"`
	Count         int               `json:"count"`
}

func (h *Handlers) GetAnnouncements(c *gin.Context) {
	sinceStr := c.DefaultQuery("since", "0")
	since, err := strconv.ParseInt(sinceStr, 10, 64)
	if err != nil {
		since = 0
	}

	stored := h.store.GetSince(since)

	announcements := make([]AnnouncementDTO, len(stored))
	for i, ann := range stored {
		announcements[i] = AnnouncementDTO{
			R:          hex.EncodeToString(ann.R[:]),
			ViewTag:    ann.ViewTag,
			BlockHint:  ann.BlockHint,
			ReceivedAt: ann.ReceivedAt,
		}
	}

	c.JSON(http.StatusOK, AnnouncementsResponse{
		Announcements: announcements,
		Count:         len(announcements),
	})
}
