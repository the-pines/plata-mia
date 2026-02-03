# xx-proxy

HTTP proxy for broadcasting stealth payment announcements via xx network.

## What it does

- Connects to xx network mainnet via cMix protocol
- Creates a public broadcast channel for stealth payment announcements
- Exposes REST API for posting and retrieving announcements
- Listens for incoming announcements from the network

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
XX_PASSWORD=your-password \
XX_SESSION_DIR=./xx-session \
PORT=8080 \
./server
```

First run takes ~10 seconds for network registration.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XX_CERT_PATH` | Yes | - | Path to mainnet certificate |
| `XX_PASSWORD` | Yes | - | Password for session encryption |
| `XX_SESSION_DIR` | No | `./xx-session` | Directory for session data |
| `XX_CHANNEL_NAME` | No | `platamiaannouncements` | Broadcast channel name |
| `XX_CHANNEL_PRINT` | No | - | Pre-generated channel PrettyPrint |
| `PORT` | No | `8080` | HTTP server port |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |

## API

### Health Check
```
GET /health
```
```json
{"status":"healthy","connected":true}
```

### Post Announcement
```bash
curl -X POST http://localhost:8080/announce \
  -H "Content-Type: application/json" \
  -d '{"r":"0102030405060708091011121314151617181920212223242526272829303132","viewTag":42,"blockHint":12345}'
```
```json
{"success":true}
```

### Get Announcements
```
GET /announcements
```
```json
{
  "announcements": [{
    "r": "...",
    "viewTag": 42,
    "blockHint": 12345,
    "receivedAt": 1770162296286
  }],
  "count": 1
}
```

## Message Format

Announcements on xx network are serialized as:
```
[1 byte: version] [32 bytes: R] [1 byte: viewTag] [8 bytes: blockHint]
```
Total: 42 bytes per announcement.

## Notes

- ERROR logs about "Failed to register node" are normal - xx network is distributed and some nodes may be temporarily unavailable
- Session data in `xx-session/` persists between restarts
- Channel PrettyPrint is logged on first run for sharing with other clients

## References

- [xx Network SDK](https://pkg.go.dev/gitlab.com/elixxir/client)
- [xxDK Examples](https://git.xx.network/elixxir/xxdk-examples)
- [xx Network](https://xx.network/)
