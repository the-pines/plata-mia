#!/usr/bin/env bash
# Check Hyperbridge gateway token registrations on testnet chains
# Usage: ALCHEMY_KEY=xxx ./check-gateways-testnet.sh
set -euo pipefail

# Load .env if present
ENV_FILE="$(dirname "$0")/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source <(grep '^NEXT_PUBLIC_ALCHEMY_API_KEY=' "$ENV_FILE")
fi
ALCHEMY_KEY="${ALCHEMY_KEY:-${NEXT_PUBLIC_ALCHEMY_API_KEY:-}}"

SEPOLIA_RPC="${ALCHEMY_KEY:+https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_KEY}"
SEPOLIA_RPC="${SEPOLIA_RPC:-https://rpc.sepolia.org}"

ASSETS=("WETH" "WBNB" "USDC" "USDT" "DAI")

CHAINS=(
  "Sepolia|${SEPOLIA_RPC}|0xFcDa26cA021d5535C3059547390E6cCd8De7acA6"
  "Arbitrum Sepolia|https://sepolia-rollup.arbitrum.io/rpc|0xFcDa26cA021d5535C3059547390E6cCd8De7acA6"
  "Optimism Sepolia|https://sepolia.optimism.io|0xFcDa26cA021d5535C3059547390E6cCd8De7acA6"
  "BSC Testnet|https://data-seed-prebsc-1-s1.bnbchain.org:8545|0xFcDa26cA021d5535C3059547390E6cCd8De7acA6"
  "Polkadot Hub Testnet|https://eth-rpc-testnet.polkadot.io|0x1c1e5be83df4a54c7a2230c337e4a3e8b7354b1c"
)

ZERO="0x0000000000000000000000000000000000000000"

printf "\n=== Hyperbridge Gateway Check: TESTNET ===\n\n"
printf "%-22s %-8s %-8s %-44s\n" "Chain" "Asset" "Status" "Address"
printf "%s\n" "$(printf '%.0s-' {1..86})"

for entry in "${CHAINS[@]}"; do
  IFS='|' read -r name rpc gateway <<< "$entry"
  for asset in "${ASSETS[@]}"; do
    asset_id=$(cast keccak "$asset")
    addr=$(cast call "$gateway" "erc20(bytes32)(address)" "$asset_id" --rpc-url "$rpc" 2>/dev/null || echo "ERROR")
    if [[ "$addr" == "ERROR" ]]; then
      printf "%-22s %-8s %-8s %s\n" "$name" "$asset" "ERROR" "RPC call failed"
    elif [[ "$addr" == "$ZERO" ]]; then
      # check erc6160
      addr6160=$(cast call "$gateway" "erc6160(bytes32)(address)" "$asset_id" --rpc-url "$rpc" 2>/dev/null || echo "$ZERO")
      if [[ "$addr6160" != "$ZERO" ]]; then
        printf "%-22s %-8s %-8s %s (erc6160)\n" "$name" "$asset" "YES" "$addr6160"
      else
        printf "%-22s %-8s %-8s\n" "$name" "$asset" "--"
      fi
    else
      printf "%-22s %-8s %-8s %s\n" "$name" "$asset" "YES" "$addr"
    fi
  done
done

printf "\nDone.\n"
