# xx-proxy

REST API for broadcasting stealth payment announcements through [xx network](https://xx.network/)'s cMix mixnet.

```
  Web App ──POST /announce──▶ xx-proxy ──broadcast──▶ xx network
           GET /announcements◀─────────◀──listener───┘
```

## Quick Start

```bash
cp .env.example .env              # set XX_CERT_PATH and XX_PASSWORD
make run                          # build + start on :8080
```

First run registers with the network (~10s). Subsequent starts reuse the session.

> **Certificate required** — create `mainnet.crt` from [deployment.go](https://github.com/Elixxir-io/client/blob/release/cmd/deployment.go) (`mainNetCert` constant).

## Make Targets

```
make build          build binary
make run            build + run (reads XX_CERT_PATH + XX_PASSWORD from shell)
make run-env        build + run (loads .env file)
make test           run tests
make clean          remove binary
make docker-build   build Docker image
make docker-run     run container (reads .env, mounts cert + volumes)
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XX_CERT_PATH` | Yes | — | Path to mainnet certificate |
| `XX_PASSWORD` | Yes | — | Session encryption password |
| `XX_SESSION_DIR` | No | `./xx-session` | cMix session data |
| `XX_CHANNEL_NAME` | No | `platamiaannouncements` | Broadcast channel name |
| `XX_CHANNEL_PRINT` | No | — | Pre-generated channel PrettyPrint |
| `XX_CHANNEL_FILE` | No | `./channel.txt` | Persisted channel PrettyPrint |
| `XX_DATA_PATH` | No | `./data` | Announcement storage |
| `PORT` | No | `8080` | HTTP port |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed origins (comma-separated) |
| `ANNOUNCE_RATE_LIMIT` | No | `10` | Max announces/sec |

## API

### `GET /health`

```json
{ "status": "healthy", "connected": true }
```

### `POST /announce`

```json
{ "r": "0102...3132", "viewTag": 42, "blockHint": 12345 }
```

| Field | Type | Description |
|-------|------|-------------|
| `r` | `string` | 32-byte hex ephemeral public key |
| `viewTag` | `uint8` | View tag for scanning |
| `blockHint` | `uint64` | Block number hint |

→ `{ "success": true }` or `429` with `{ "success": false, "error": "rate limit exceeded" }`

### `GET /announcements?since=<ms>`

```json
{
  "announcements": [{ "r": "...", "viewTag": 42, "blockHint": 12345, "receivedAt": 1770162296286 }],
  "count": 1
}
```

## Wire Format

42 bytes per announcement:

```
[1B version] [32B R] [1B viewTag] [8B blockHint BE]
```

## Docker

```bash
make docker-build
make docker-run
```

Volumes mount automatically for session and data persistence. For production, set `CORS_ORIGINS` in `.env`.

## Persistence

**Channel** — PrettyPrint saved to `XX_CHANNEL_FILE`, restored on restart for consistent identity.

**Announcements** — append-only log at `XX_DATA_PATH/announcements.txt`, loaded into memory on startup.

## Notes

- `"Failed to register node"` errors are expected — xx network nodes may be temporarily unavailable
- Back up `XX_SESSION_DIR` for session continuity
- For production, use Docker with persistent volumes for `/app/data` and `/app/xx-session`
