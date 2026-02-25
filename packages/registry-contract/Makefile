.PHONY: build test deploy deploy-dry clean

# Compile contracts
build:
	forge build

# Run tests
test:
	forge test -vvv

# Deploy to Polkadot Hub TestNet
deploy:
	forge script script/Deploy.s.sol --rpc-url polkadot_testnet --broadcast --verify

# Dry run (simulate without broadcasting)
deploy-dry:
	forge script script/Deploy.s.sol --rpc-url polkadot_testnet

# Remove build artifacts
clean:
	forge clean
