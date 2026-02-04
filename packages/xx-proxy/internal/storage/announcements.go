package storage

import (
	"bufio"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
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
	dataPath      string
	filePath      string
}

func NewStore(dataPath string) *Store {
	return &Store{
		announcements: make([]StoredAnnouncement, 0),
		dataPath:      dataPath,
		filePath:      filepath.Join(dataPath, "announcements.txt"),
	}
}

func (s *Store) Add(ann Announcement) {
	s.mu.Lock()
	defer s.mu.Unlock()

	stored := StoredAnnouncement{
		Announcement: ann,
		ReceivedAt:   time.Now().UnixMilli(),
	}
	s.announcements = append(s.announcements, stored)
	s.save(stored)
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

func (s *Store) Load() error {
	if s.dataPath == "" {
		return nil
	}
	if err := os.MkdirAll(s.dataPath, 0755); err != nil {
		return fmt.Errorf("create data directory: %w", err)
	}
	file, err := os.Open(s.filePath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("open announcements file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		ann, err := parseLine(line)
		if err != nil {
			continue
		}
		s.announcements = append(s.announcements, ann)
	}
	return scanner.Err()
}

func (s *Store) save(ann StoredAnnouncement) {
	if s.dataPath == "" {
		return
	}
	os.MkdirAll(s.dataPath, 0755)
	file, err := os.OpenFile(s.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()
	line := formatLine(ann)
	file.WriteString(line + "\n")
}

func formatLine(ann StoredAnnouncement) string {
	return fmt.Sprintf("%s,%d,%d,%d", hex.EncodeToString(ann.R[:]), ann.ViewTag, ann.BlockHint, ann.ReceivedAt)
}

func parseLine(line string) (StoredAnnouncement, error) {
	parts := strings.Split(line, ",")
	if len(parts) != 4 {
		return StoredAnnouncement{}, errors.New("invalid line format")
	}
	rBytes, err := hex.DecodeString(parts[0])
	if err != nil || len(rBytes) != 32 {
		return StoredAnnouncement{}, errors.New("invalid R value")
	}
	viewTag, err := strconv.ParseUint(parts[1], 10, 8)
	if err != nil {
		return StoredAnnouncement{}, errors.New("invalid viewTag")
	}
	blockHint, err := strconv.ParseUint(parts[2], 10, 64)
	if err != nil {
		return StoredAnnouncement{}, errors.New("invalid blockHint")
	}
	receivedAt, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil {
		return StoredAnnouncement{}, errors.New("invalid receivedAt")
	}
	var ann StoredAnnouncement
	copy(ann.R[:], rBytes)
	ann.ViewTag = uint8(viewTag)
	ann.BlockHint = blockHint
	ann.ReceivedAt = receivedAt
	return ann, nil
}
