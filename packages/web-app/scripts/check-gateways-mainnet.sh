#!/usr/bin/env bash
# Check Hyperbridge gateway token registrations on mainnet chains
# Usage: ALCHEMY_KEY=xxx ./check-gateways-mainnet.sh
set -euo pipefail

# Load .env if present
ENV_FILE="$(dirname "$0")/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source <(grep '^NEXT_PUBLIC_ALCHEMY_API_KEY=' "$ENV_FILE")
fi
ALCHEMY_KEY="${ALCHEMY_KEY:-${NEXT_PUBLIC_ALCHEMY_API_KEY:-}}"

ETH_RPC="${ALCHEMY_KEY:+https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_KEY}"
ETH_RPC="${ETH_RPC:-https://eth.llamarpc.com}"

ASSETS=("WETH" "WBNB" "USDC" "USDT" "DAI")

CHAINS=(
  "Ethereum|${ETH_RPC}|0xFd413e3AFe560182C4471F4d143A96d3e259B6dE"
  "Arbitrum|https://arb1.arbitrum.io/rpc|0xFd413e3AFe560182C4471F4d143A96d3e259B6dE"
  "Optimism|https://mainnet.optimism.io|0xFd413e3AFe560182C4471F4d143A96d3e259B6dE"
  "BSC|https://bsc-dataseed.bnbchain.org|0xFd413e3AFe560182C4471F4d143A96d3e259B6dE"
)

ZERO="0x0000000000000000000000000000000000000000"

printf "\n=== Hyperbridge Gateway Check: MAINNET ===\n\n"
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
