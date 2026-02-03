package storage

import (
	"bytes"
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
	store := NewStore()

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
	store := NewStore()

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
	store := NewStore()
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
