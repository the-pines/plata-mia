# Registry Contract

Stealth meta-address registry for the Plata Mia protocol. Users register their public keys so senders can look up recipients and derive stealth addresses.

## Contract API

```solidity
// Register a new stealth meta-address (reverts IdentifierAlreadyRegistered if taken)
function register(bytes32 identifier, bytes32 spendingKey, bytes32 viewingKey, uint32 preferredChain, string nickname) external

// Look up by identifier (returns exists = false if not found)
function lookup(bytes32 identifier) external view returns (bytes32 spendingKey, bytes32 viewingKey, uint32 preferredChain, string nickname, bool exists)

// Get registration owner (address(0) if not registered)
function getOwner(bytes32 identifier) external view returns (address)

// Update preferred chain (owner only, reverts NotOwner / NotFound)
function updatePreferredChain(bytes32 identifier, uint32 newChain) external

// Update nickname (owner only, reverts NotOwner / NotFound)
function updateNickname(bytes32 identifier, string newNickname) external
```

## Events

```solidity
event Registered(bytes32 indexed identifier, address indexed owner, bytes32 spendingKey, bytes32 viewingKey, uint32 preferredChain, string nickname)
event ChainUpdated(bytes32 indexed identifier, uint32 oldChain, uint32 newChain)
event NicknameUpdated(bytes32 indexed identifier, string oldNickname, string newNickname)
```

## Scripts

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
cp .env.example .env   # add your deployer private key
```

```bash
make build          # compile
make test           # run tests
make deploy-dry     # simulate deployment
make deploy         # deploy to Polkadot Hub TestNet
```

## Deployment

| Network | Chain ID | Address |
|---------|----------|---------|
| Polkadot Hub TestNet | 420420417 | `0x47568470D89CD2Ea20553ffB08bD630BC95FE4bB` |
