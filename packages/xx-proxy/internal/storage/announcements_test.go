package storage

import (
	"bytes"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestSerializeDeserialize(t *testing.T) {
	var r [32]byte
	for i := 0; i < 32; i++ {
		r[i] = byte(i)
	}

	ann := Announcement{
		R:         r,
		ViewTag:   42,
		BlockHint: 123456789,
	}

	serialized := Serialize(ann)

	if len(serialized) != WireFormatSize {
		t.Errorf("expected size %d, got %d", WireFormatSize, len(serialized))
	}

	if serialized[0] != WireFormatVersion {
		t.Errorf("expected version %d, got %d", WireFormatVersion, serialized[0])
	}

	deserialized, err := Deserialize(serialized)
	if err != nil {
		t.Fatalf("deserialize failed: %v", err)
	}

	if !bytes.Equal(deserialized.R[:], ann.R[:]) {
		t.Error("R mismatch")
	}

	if deserialized.ViewTag != ann.ViewTag {
		t.Errorf("ViewTag mismatch: expected %d, got %d", ann.ViewTag, deserialized.ViewTag)
	}

	if deserialized.BlockHint != ann.BlockHint {
		t.Errorf("BlockHint mismatch: expected %d, got %d", ann.BlockHint, deserialized.BlockHint)
	}
}

func TestDeserializeInvalidSize(t *testing.T) {
	_, err := Deserialize(make([]byte, 10))
	if err != ErrInvalidPayloadSize {
		t.Errorf("expected ErrInvalidPayloadSize, got %v", err)
	}
}

func TestDeserializeInvalidVersion(t *testing.T) {
	data := make([]byte, WireFormatSize)
	data[0] = 99 // invalid version
	_, err := Deserialize(data)
	if err != ErrInvalidVersion {
		t.Errorf("expected ErrInvalidVersion, got %v", err)
	}
}

func TestStoreAddAndGet(t *testing.T) {
	store := NewStore("")

	var r1, r2 [32]byte
	r1[0] = 1
	r2[0] = 2

	ann1 := Announcement{R: r1, ViewTag: 1, BlockHint: 100}
	ann2 := Announcement{R: r2, ViewTag: 2, BlockHint: 200}

	store.Add(ann1)
	time.Sleep(10 * time.Millisecond)
	midTime := time.Now().UnixMilli()
	time.Sleep(10 * time.Millisecond)
	store.Add(ann2)

	all := store.GetAll()
	if len(all) != 2 {
		t.Errorf("expected 2 announcements, got %d", len(all))
	}

	since := store.GetSince(midTime)
	if len(since) != 1 {
		t.Errorf("expected 1 announcement since midTime, got %d", len(since))
	}

	if since[0].ViewTag != 2 {
		t.Errorf("expected ViewTag 2, got %d", since[0].ViewTag)
	}
}

func TestStoreCount(t *testing.T) {
	store := NewStore("")

	if store.Count() != 0 {
		t.Errorf("expected count 0, got %d", store.Count())
	}

	store.Add(Announcement{ViewTag: 1})
	store.Add(Announcement{ViewTag: 2})

	if store.Count() != 2 {
		t.Errorf("expected count 2, got %d", store.Count())
	}
}

func TestStoreConcurrency(t *testing.T) {
	store := NewStore("")
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			store.Add(Announcement{ViewTag: uint8(idx % 256)})
		}(i)
	}

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = store.GetAll()
		}()
	}

	wg.Wait()

	if store.Count() != 100 {
		t.Errorf("expected count 100, got %d", store.Count())
	}
}

func TestStorePersistence(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "storage-test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store1 := NewStore(tmpDir)
	var r [32]byte
	r[0] = 0xab
	r[31] = 0xcd
	store1.Add(Announcement{R: r, ViewTag: 42, BlockHint: 123456})

	if store1.Count() != 1 {
		t.Errorf("expected count 1, got %d", store1.Count())
	}

	store2 := NewStore(tmpDir)
	if err := store2.Load(); err != nil {
		t.Fatalf("load failed: %v", err)
	}

	if store2.Count() != 1 {
		t.Errorf("expected count 1 after load, got %d", store2.Count())
	}

	loaded := store2.GetAll()[0]
	if loaded.R[0] != 0xab || loaded.R[31] != 0xcd {
		t.Error("R mismatch after load")
	}
	if loaded.ViewTag != 42 {
		t.Errorf("ViewTag mismatch: expected 42, got %d", loaded.ViewTag)
	}
	if loaded.BlockHint != 123456 {
		t.Errorf("BlockHint mismatch: expected 123456, got %d", loaded.BlockHint)
	}
}

func TestStoreLoadNonExistent(t *testing.T) {
	tmpDir, _ := os.MkdirTemp("", "storage-test")
	defer os.RemoveAll(tmpDir)

	store := NewStore(tmpDir)
	if err := store.Load(); err != nil {
		t.Errorf("load should not error for non-existent file: %v", err)
	}
	if store.Count() != 0 {
		t.Errorf("expected count 0, got %d", store.Count())
	}
}

func TestFormatParseLine(t *testing.T) {
	var r [32]byte
	for i := range r {
		r[i] = byte(i)
	}
	ann := StoredAnnouncement{
		Announcement: Announcement{R: r, ViewTag: 99, BlockHint: 999999},
		ReceivedAt:   1234567890123,
	}

	line := formatLine(ann)
	parsed, err := parseLine(line)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	if !bytes.Equal(parsed.R[:], ann.R[:]) {
		t.Error("R mismatch")
	}
	if parsed.ViewTag != ann.ViewTag {
		t.Errorf("ViewTag mismatch: expected %d, got %d", ann.ViewTag, parsed.ViewTag)
	}
	if parsed.BlockHint != ann.BlockHint {
		t.Errorf("BlockHint mismatch: expected %d, got %d", ann.BlockHint, parsed.BlockHint)
	}
	if parsed.ReceivedAt != ann.ReceivedAt {
		t.Errorf("ReceivedAt mismatch: expected %d, got %d", ann.ReceivedAt, parsed.ReceivedAt)
	}
}

func TestParseLineInvalid(t *testing.T) {
	cases := []string{
		"",
		"a,b",
		"notahex,1,2,3",
		"00,1,2,3",
	}
	for _, c := range cases {
		_, err := parseLine(c)
		if err == nil {
			t.Errorf("expected error for %q", c)
		}
	}
}

func TestStoreEmptyDataPath(t *testing.T) {
	store := NewStore("")
	if err := store.Load(); err != nil {
		t.Errorf("load with empty path should not error: %v", err)
	}
	store.Add(Announcement{ViewTag: 1})
	if store.Count() != 1 {
		t.Errorf("expected count 1, got %d", store.Count())
	}
	if _, err := os.Stat(filepath.Join("", "announcements.txt")); err == nil {
		t.Error("should not create file with empty path")
	}
}
