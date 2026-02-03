package storage

import (
	"encoding/binary"
	"errors"
	"sync"
	"time"
)

const (
	WireFormatVersion = 1
	WireFormatSize    = 42 // version(1) + R(32) + viewTag(1) + blockHint(8)
)

var (
	ErrInvalidPayloadSize = errors.New("invalid payload size: expected 42 bytes")
	ErrInvalidVersion     = errors.New("invalid wire format version")
)

type Announcement struct {
	R         [32]byte
	ViewTag   uint8
	BlockHint uint64
}

type StoredAnnouncement struct {
	Announcement
	ReceivedAt int64 // Unix milliseconds
}

type Store struct {
	mu            sync.RWMutex
	announcements []StoredAnnouncement
}

func NewStore() *Store {
	return &Store{
		announcements: make([]StoredAnnouncement, 0),
	}
}

func (s *Store) Add(ann Announcement) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.announcements = append(s.announcements, StoredAnnouncement{
		Announcement: ann,
		ReceivedAt:   time.Now().UnixMilli(),
	})
}

func (s *Store) GetSince(timestampMs int64) []StoredAnnouncement {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]StoredAnnouncement, 0)
	for _, ann := range s.announcements {
		if ann.ReceivedAt >= timestampMs {
			result = append(result, ann)
		}
	}
	return result
}

func (s *Store) GetAll() []StoredAnnouncement {
	return s.GetSince(0)
}

func (s *Store) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.announcements)
}

// Serialize converts an announcement to wire format (42 bytes)
// Format: [version:1][R:32][viewTag:1][blockHint:8]
func Serialize(ann Announcement) []byte {
	buf := make([]byte, WireFormatSize)
	buf[0] = WireFormatVersion
	copy(buf[1:33], ann.R[:])
	buf[33] = ann.ViewTag
	binary.BigEndian.PutUint64(buf[34:42], ann.BlockHint)
	return buf
}

// Deserialize parses wire format bytes into an Announcement
func Deserialize(data []byte) (Announcement, error) {
	if len(data) != WireFormatSize {
		return Announcement{}, ErrInvalidPayloadSize
	}

	if data[0] != WireFormatVersion {
		return Announcement{}, ErrInvalidVersion
	}

	var ann Announcement
	copy(ann.R[:], data[1:33])
	ann.ViewTag = data[33]
	ann.BlockHint = binary.BigEndian.Uint64(data[34:42])

	return ann, nil
}
