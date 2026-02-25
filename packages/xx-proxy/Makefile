.PHONY: build run test clean docker-build docker-run

BIN := server

# Build the server binary
build:
	go build -o $(BIN) ./cmd/server

# Run locally (requires .env or exported vars)
run: build
	./$(BIN)

# Run tests
test:
	go test ./...

# Remove build artifacts
clean:
	rm -f $(BIN)

# Docker
docker-build:
	docker build -t xx-proxy .

docker-run:
	docker run -d \
		--env-file .env \
		-v $$(pwd)/mainnet.crt:/app/mainnet.crt:ro \
		-v xx-proxy-session:/app/xx-session \
		-v xx-proxy-data:/app/data \
		-p 8080:8080 \
		xx-proxy
