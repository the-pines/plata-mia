#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  source .env
fi

if [ -z "$DEPLOYER_SURI" ]; then
  echo "Error: DEPLOYER_SURI not set"
  echo "Set it in .env or export DEPLOYER_SURI='your seed phrase'"
  exit 1
fi

RPC_URL="${RPC_URL:-wss://rpc1.paseo.popnetwork.xyz}"

echo "Building contract..."
cargo contract build --release

echo "Running tests..."
cargo test

echo "Deploying to $RPC_URL..."
cargo contract instantiate \
  --url "$RPC_URL" \
  --suri "$DEPLOYER_SURI" \
  --constructor new \
  --execute

echo "Deployment complete!"
