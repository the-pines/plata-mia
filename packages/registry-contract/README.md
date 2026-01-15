# registry-contract

ink! smart contract for storing stealth meta-addresses on Polkadot Asset Hub.

## Installation

```bash
# Prerequisites
cargo install cargo-contract --version 6.0.0-beta.1 --force

# Build
cd packages/registry-contract
cargo contract build --release
```

## Test

```bash
cargo test
```

## API

### Functions

```rust
// Register a new stealth meta-address (caller becomes owner)
fn register(
    identifier: [u8; 32],
    spending_key: [u8; 32],
    viewing_key: [u8; 32],
    preferred_chain: u32,
) -> Result<(), RegistryError>

// Lookup a meta-address by identifier
fn lookup(identifier: [u8; 32]) -> Option<StealthMetaAddress>

// Update preferred chain (owner only)
fn update_preferred_chain(
    identifier: [u8; 32],
    new_chain: u32,
) -> Result<(), RegistryError>

// Get registration owner
fn get_owner(identifier: [u8; 32]) -> Option<Address>
```

### Errors

```rust
enum RegistryError {
    IdentifierAlreadyRegistered,  // register() called with an identifier that already exists
    NotFound,                     // update_preferred_chain() called with unknown identifier
    NotOwner,                     // update_preferred_chain() called by non-owner
}
```

### Events

```rust
Registered { identifier, owner, spending_key, viewing_key, preferred_chain }
ChainUpdated { identifier, old_chain, new_chain }
```

## Usage

```typescript
import { ContractPromise } from '@polkadot/api-contract';
import metadata from './registry.json';

const contract = new ContractPromise(api, metadata, CONTRACT_ADDRESS);

// Register
await contract.tx.register(
  { gasLimit },
  identifierHash,
  spendingKey,
  viewingKey,
  chainId
).signAndSend(account);

// Lookup
const { output } = await contract.query.lookup(account.address, { gasLimit }, identifierHash);
const meta = output?.toHuman();
```

## Dependencies

- `ink` 6.x (pallet-revive / PolkaVM)
- `parity-scale-codec`
- `scale-info`

## Notes

- All data is publicly readable (privacy comes from stealth addresses, not the registry)
- Entries cannot be deleted (prevents front-running attacks)
- Only the original registrant can update their entry
