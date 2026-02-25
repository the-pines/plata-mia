.PHONY: build run test clean docker-build docker-run

BIN := server

build:
	go build -o $(BIN) ./cmd/server

run: build
	XX_CERT_PATH=./mainnet.crt XX_PASSWORD=$${XX_PASSWORD:?set XX_PASSWORD} ./$(BIN)

run-env: build
	@test -f .env || (echo "missing .env — cp .env.example .env" && exit 1)
	set -a && . ./.env && set +a && ./$(BIN)

test:
	go test ./...

clean:
	rm -f $(BIN)

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
