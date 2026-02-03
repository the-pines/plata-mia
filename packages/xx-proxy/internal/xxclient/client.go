package xxclient

import (
	"fmt"
	"os"
	"sync"
	"time"

	"gitlab.com/elixxir/client/v4/xxdk"
	"gitlab.com/xx_network/crypto/csprng"
)

type Client struct {
	net      *xxdk.Cmix
	healthy  bool
	healthMu sync.RWMutex
	healthCh chan bool
	stopOnce sync.Once
}

type ClientConfig struct {
	NDFURL     string
	CertPath   string
	SessionDir string
	Password   string
}

func NewClient(cfg ClientConfig) (*Client, error) {
	var cert string
	if cfg.CertPath != "" {
		certBytes, err := os.ReadFile(cfg.CertPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read certificate: %w", err)
		}
		cert = string(certBytes)
	}

	ndfJSON, err := xxdk.DownloadAndVerifySignedNdfWithUrl(cfg.NDFURL, cert)
	if err != nil {
		return nil, fmt.Errorf("failed to download NDF: %w", err)
	}

	password := []byte(cfg.Password)
	sessionExists := false
	if _, err := os.Stat(cfg.SessionDir); err == nil {
		sessionExists = true
	}

	if !sessionExists {
		err = xxdk.NewCmix(string(ndfJSON), cfg.SessionDir, password, "")
		if err != nil {
			return nil, fmt.Errorf("failed to create session: %w", err)
		}
	}

	params := xxdk.GetDefaultCMixParams()
	net, err := xxdk.LoadCmix(cfg.SessionDir, password, params)
	if err != nil {
		return nil, fmt.Errorf("failed to load session: %w", err)
	}

	client := &Client{
		net:      net,
		healthy:  false,
		healthCh: make(chan bool, 1),
	}

	return client, nil
}

func (c *Client) Start() error {
	healthCB := func(healthy bool) {
		c.healthMu.Lock()
		c.healthy = healthy
		c.healthMu.Unlock()

		select {
		case c.healthCh <- healthy:
		default:
		}
	}

	_ = c.net.GetCmix().AddHealthCallback(healthCB)

	err := c.net.StartNetworkFollower(5 * time.Second)
	if err != nil {
		return fmt.Errorf("failed to start network follower: %w", err)
	}

	return nil
}

func (c *Client) WaitForHealthy(timeout time.Duration) error {
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	c.healthMu.RLock()
	if c.healthy {
		c.healthMu.RUnlock()
		return nil
	}
	c.healthMu.RUnlock()

	for {
		select {
		case healthy := <-c.healthCh:
			if healthy {
				return nil
			}
		case <-timer.C:
			return fmt.Errorf("timeout waiting for network to become healthy")
		}
	}
}

func (c *Client) IsHealthy() bool {
	c.healthMu.RLock()
	defer c.healthMu.RUnlock()
	return c.healthy
}

func (c *Client) GetCmix() *xxdk.Cmix {
	return c.net
}

func (c *Client) GetRng() csprng.Source {
	return c.net.GetRng().GetStream()
}

func (c *Client) Stop() {
	c.stopOnce.Do(func() {
		if c.net != nil {
			_ = c.net.StopNetworkFollower()
		}
	})
}
