package xxclient

import (
	"log"

	"github.com/plata-mia/xx-proxy/internal/storage"
	"gitlab.com/elixxir/client/v4/broadcast"
	"gitlab.com/elixxir/client/v4/cmix/identity/receptionID"
	"gitlab.com/elixxir/client/v4/cmix/rounds"
)

const AnnouncementTag = "announcement"

type Listener struct {
	store   *storage.Store
	channel *BroadcastChannel
}

func NewListener(store *storage.Store, channel *BroadcastChannel) *Listener {
	return &Listener{
		store:   store,
		channel: channel,
	}
}

func (l *Listener) Start() error {
	listenerCb := broadcast.ListenerFunc(func(
		payload, encryptedPayload []byte,
		tags []string,
		metadata [2]byte,
		reception receptionID.EphemeralIdentity,
		round rounds.Round,
	) {
		ann, err := storage.Deserialize(payload)
		if err != nil {
			log.Printf("failed to deserialize announcement: %v", err)
			return
		}

		l.store.Add(ann)
		log.Printf("received announcement: viewTag=%d, blockHint=%d", ann.ViewTag, ann.BlockHint)
	})

	return l.channel.RegisterListener(listenerCb, []string{AnnouncementTag})
}
