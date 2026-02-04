# xx-proxy

HTTP proxy for broadcasting stealth payment announcements via xx network's cMix protocol.

## Overview

xx-proxy provides a REST API layer for stealth payment announcement propagation through xx network, enabling private transaction notifications for the Plata Mia stealth payment system.

**Key Features:**
- Connects to xx network mainnet via cMix mixnet
- Public broadcast channel for stealth payment announcements
- Persistent storage for announcements and channel state
- Rate limiting for abuse prevention
- Configuration validation at startup

## Architecture

```
┌─────────────┐     ┌───────────┐     ┌────────────┐
│  Web App    │────▶│ xx-proxy  │────▶│ xx network │
└─────────────┘     └───────────┘     └────────────┘
      POST /announce      │                  │
      GET /announcements  │◀─────────────────┘
                          │   broadcast listener
```

## Quick Start

### 1. Build
```bash
go build -o server ./cmd/server
```

### 2. Get mainnet certificate
Create `mainnet.crt` with the certificate from [deployment.go](https://github.com/Elixxir-io/client/blob/release/cmd/deployment.go) (look for `mainNetCert`).

### 3. Run
```bash
XX_CERT_PATH=./mainnet.crt \
XX_PASSWORD=your-session-password \
./server
```

First run registers with the network (~10 seconds). Subsequent restarts load the existing session.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XX_CERT_PATH` | Yes | - | Path to mainnet certificate file |
| `XX_PASSWORD` | Yes | - | Password for session encryption |
| `XX_SESSION_DIR` | No | `./xx-session` | Directory for cMix session data |
| `XX_CHANNEL_NAME` | No | `platamiaannouncements` | Broadcast channel name |
| `XX_CHANNEL_PRINT` | No | - | Pre-generated channel PrettyPrint |
| `XX_CHANNEL_FILE` | No | `./channel.txt` | File to persist channel PrettyPrint |
| `XX_DATA_PATH` | No | `./data` | Directory for announcement storage |
| `PORT` | No | `8080` | HTTP server port |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `ANNOUNCE_RATE_LIMIT` | No | `10` | Max announcements per second |

## API Reference

### Health Check
```
GET /health
```
Returns connection status to xx network.

**Response:**
```json
{"status": "healthy", "connected": true}
```

### Post Announcement
```
POST /announce
Content-Type: application/json
```
Broadcasts a stealth payment announcement to the network.

**Request:**
```json
{
  "r": "0102030405060708091011121314151617181920212223242526272829303132",
  "viewTag": 42,
  "blockHint": 12345
}
```

| Field | Type | Description |
|-------|------|-------------|
| `r` | string | 32-byte hex-encoded ephemeral public key |
| `viewTag` | uint8 | View tag for efficient scanning |
| `blockHint` | uint64 | Block number hint for the transaction |

**Response:**
```json
{"success": true}
```

**Rate Limited Response (429):**
```json
{"success": false, "error": "rate limit exceeded"}
```

### Get Announcements
```
GET /announcements?since=<timestamp>
```
Retrieves announcements from storage.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `since` | int64 | Unix timestamp (ms) to filter results (optional) |

**Response:**
```json
{
  "announcements": [{
    "r": "0102030405060708091011121314151617181920212223242526272829303132",
    "viewTag": 42,
    "blockHint": 12345,
    "receivedAt": 1770162296286
  }],
  "count": 1
}
```

## Wire Format

Announcements are serialized to 42 bytes for network transmission:

```
[1 byte: version] [32 bytes: R] [1 byte: viewTag] [8 bytes: blockHint BE]
```

## Docker

```bash
docker build -t xx-proxy .
docker run -d \
  -v /path/to/mainnet.crt:/app/mainnet.crt:ro \
  -v xx-proxy-data:/app/data \
  -v xx-proxy-session:/app/xx-session \
  -e XX_CERT_PATH=/app/mainnet.crt \
  -e XX_PASSWORD=your-password \
  -e CORS_ORIGINS=https://your-domain.com \
  -p 8080:8080 \
  xx-proxy
```

## Persistence

**Channel State:** The channel PrettyPrint is saved to `XX_CHANNEL_FILE` on first creation and loaded on subsequent restarts. This ensures consistent channel identity across deployments.

**Announcements:** All received announcements are persisted to `XX_DATA_PATH/announcements.txt` and restored on startup.

## Operational Notes

- `ERROR logs about "Failed to register node"` are expected - xx network is distributed and some nodes may be temporarily unavailable
- Session data in `XX_SESSION_DIR` should be backed up for continuity
- For production, mount persistent volumes for `/app/data` and `/app/xx-session`

## References

- [xx Network SDK](https://pkg.go.dev/gitlab.com/elixxir/client)
- [xxDK Examples](https://git.xx.network/elixxir/xxdk-examples)
- [xx Network](https://xx.network/)
