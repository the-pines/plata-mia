FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /xx-proxy ./cmd/server

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /xx-proxy .

RUN adduser -D -u 1000 appuser
RUN mkdir -p /app/xx-session && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

ENV PORT=8080
ENV XX_SESSION_DIR=/app/xx-session

ENTRYPOINT ["./xx-proxy"]
