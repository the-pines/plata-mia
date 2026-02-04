package xxclient

import (
	"fmt"

	"gitlab.com/elixxir/client/v4/broadcast"
	"gitlab.com/elixxir/client/v4/cmix"
	cryptoBroadcast "gitlab.com/elixxir/crypto/broadcast"
	"gitlab.com/xx_network/crypto/csprng"
)

type ChannelConfig struct {
	Name        string
	Description string
	PrettyPrint string // Pre-exported channel (Option A: hardcoded)
}

type BroadcastChannel struct {
	channel broadcast.Channel
	crypto  *cryptoBroadcast.Channel
}

// NewBroadcastChannel creates or loads a broadcast channel.
// If PrettyPrint is provided, it loads that channel; otherwise creates a new one.
func NewBroadcastChannel(client *Client, cfg ChannelConfig, rng csprng.Source) (*BroadcastChannel, error) {
	var cryptoChan *cryptoBroadcast.Channel
	var err error

	if cfg.PrettyPrint != "" {
		cryptoChan, err = cryptoBroadcast.NewChannelFromPrettyPrint(cfg.PrettyPrint)
		if err != nil {
			return nil, fmt.Errorf("failed to load channel from PrettyPrint: %w", err)
		}
	} else {
		maxMsgLen := client.GetCmix().GetCmix().GetMaxMessageLength()
		cryptoChan, _, err = cryptoBroadcast.NewChannel(
			cfg.Name,
			cfg.Description,
			cryptoBroadcast.Public,
			maxMsgLen,
			rng,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create new channel: %w", err)
		}
	}

	channel, err := broadcast.NewBroadcastChannel(
		cryptoChan,
		client.GetCmix().GetCmix(),
		client.GetCmix().GetRng(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create broadcast channel: %w", err)
	}

	return &BroadcastChannel{
		channel: channel,
		crypto:  cryptoChan,
	}, nil
}

// Broadcast sends a payload to the channel.
func (bc *BroadcastChannel) Broadcast(payload []byte, tags []string) error {
	maxSize := bc.channel.MaxPayloadSize()
	if len(payload) > maxSize {
		return fmt.Errorf("payload size %d exceeds max %d", len(payload), maxSize)
	}

	_, _, err := bc.channel.Broadcast(
		payload,
		tags,
		[2]byte{0, 0},
		cmix.GetDefaultCMIXParams(),
	)
	if err != nil {
		return fmt.Errorf("broadcast failed: %w", err)
	}

	return nil
}

// RegisterListener registers a symmetric listener for incoming messages.
func (bc *BroadcastChannel) RegisterListener(callback broadcast.ListenerFunc, tags []string) error {
	_, err := bc.channel.RegisterSymmetricListener(callback, tags)
	if err != nil {
		return fmt.Errorf("failed to register listener: %w", err)
	}
	return nil
}

// MaxPayloadSize returns the maximum symmetric payload size.
func (bc *BroadcastChannel) MaxPayloadSize() int {
	return bc.channel.MaxPayloadSize()
}

// PrettyPrint returns the channel's PrettyPrint string for sharing.
func (bc *BroadcastChannel) PrettyPrint() string {
	return bc.crypto.PrettyPrint()
}

// Stop stops the channel and unregisters listeners.
func (bc *BroadcastChannel) Stop() {
	bc.channel.Stop()
}
