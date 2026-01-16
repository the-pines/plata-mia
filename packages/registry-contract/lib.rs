#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod registry {
    use ink::storage::Mapping;

    /// Stealth meta-address containing the public keys needed for stealth payments
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct StealthMetaAddress {
        /// Spending public key (S) - 32 bytes
        pub spending_key: [u8; 32],
        /// Viewing public key (V) - 32 bytes
        pub viewing_key: [u8; 32],
        /// Preferred chain ID for receiving funds
        pub preferred_chain: u32,
    }

    /// Errors that can occur in the registry contract
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum RegistryError {
        /// The identifier is already registered
        IdentifierAlreadyRegistered,
        /// The identifier was not found
        NotFound,
        /// The caller is not the owner of this registration
        NotOwner,
    }

    /// Event emitted when a new stealth meta-address is registered
    #[ink(event)]
    pub struct Registered {
        #[ink(topic)]
        identifier: [u8; 32],
        #[ink(topic)]
        owner: AccountId,
        spending_key: [u8; 32],
        viewing_key: [u8; 32],
        preferred_chain: u32,
    }

    /// Event emitted when a preferred chain is updated
    #[ink(event)]
    pub struct ChainUpdated {
        #[ink(topic)]
        identifier: [u8; 32],
        old_chain: u32,
        new_chain: u32,
    }

    /// Registry contract for storing stealth meta-addresses
    #[ink(storage)]
    pub struct Registry {
        /// Maps identifier hash to stealth meta-address
        entries: Mapping<[u8; 32], StealthMetaAddress>,
        /// Maps identifier to owner account (for access control)
        owners: Mapping<[u8; 32], AccountId>,
    }

    impl Registry {
        /// Creates a new empty registry
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                entries: Mapping::default(),
                owners: Mapping::default(),
            }
        }

        /// Registers a new stealth meta-address
        ///
        /// The caller becomes the owner of this registration.
        ///
        /// # Errors
        /// - `IdentifierAlreadyRegistered` if the identifier is already taken
        #[ink(message)]
        pub fn register(
            &mut self,
            identifier: [u8; 32],
            spending_key: [u8; 32],
            viewing_key: [u8; 32],
            preferred_chain: u32,
        ) -> Result<(), RegistryError> {
            // Check if already registered
            if self.entries.contains(identifier) {
                return Err(RegistryError::IdentifierAlreadyRegistered);
            }

            // Store the entry
            let meta = StealthMetaAddress {
                spending_key,
                viewing_key,
                preferred_chain,
            };
            self.entries.insert(identifier, &meta);
            self.owners.insert(identifier, &self.env().caller());

            // Emit event
            self.env().emit_event(Registered {
                identifier,
                owner: self.env().caller(),
                spending_key,
                viewing_key,
                preferred_chain,
            });

            Ok(())
        }

        /// Looks up a stealth meta-address by identifier
        ///
        /// Returns `None` if the identifier is not registered.
        #[ink(message)]
        pub fn lookup(&self, identifier: [u8; 32]) -> Option<StealthMetaAddress> {
            self.entries.get(identifier)
        }

        /// Returns the owner of a registration
        #[ink(message)]
        pub fn get_owner(&self, identifier: [u8; 32]) -> Option<AccountId> {
            self.owners.get(identifier)
        }

        /// Updates the preferred chain for an existing registration
        ///
        /// # Errors
        /// - `NotFound` if the identifier doesn't exist
        /// - `NotOwner` if the caller is not the registration owner
        #[ink(message)]
        pub fn update_preferred_chain(
            &mut self,
            identifier: [u8; 32],
            new_chain: u32,
        ) -> Result<(), RegistryError> {
            // Check existence
            let mut meta = self.entries.get(identifier).ok_or(RegistryError::NotFound)?;

            // Check ownership
            let owner = self.owners.get(identifier).ok_or(RegistryError::NotFound)?;
            if owner != self.env().caller() {
                return Err(RegistryError::NotOwner);
            }

            // Update
            let old_chain = meta.preferred_chain;
            meta.preferred_chain = new_chain;
            self.entries.insert(identifier, &meta);

            // Emit event
            self.env().emit_event(ChainUpdated {
                identifier,
                old_chain,
                new_chain,
            });

            Ok(())
        }
    }

    impl Default for Registry {
        fn default() -> Self {
            Self::new()
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn set_caller(caller: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
        }

        fn test_identifier() -> [u8; 32] {
            [1u8; 32]
        }

        fn test_spending_key() -> [u8; 32] {
            [2u8; 32]
        }

        fn test_viewing_key() -> [u8; 32] {
            [3u8; 32]
        }

        #[ink::test]
        fn new_creates_empty_registry() {
            let registry = Registry::new();
            assert_eq!(registry.lookup(test_identifier()), None);
        }

        #[ink::test]
        fn register_works() {
            let mut registry = Registry::new();
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let result = registry.register(
                test_identifier(),
                test_spending_key(),
                test_viewing_key(),
                1000, // chain id
            );

            assert!(result.is_ok());

            let meta = registry.lookup(test_identifier());
            assert!(meta.is_some());

            let meta = meta.unwrap();
            assert_eq!(meta.spending_key, test_spending_key());
            assert_eq!(meta.viewing_key, test_viewing_key());
            assert_eq!(meta.preferred_chain, 1000);
        }

        #[ink::test]
        fn register_sets_owner() {
            let mut registry = Registry::new();
            let accounts = default_accounts();
            set_caller(accounts.alice);

            registry
                .register(test_identifier(), test_spending_key(), test_viewing_key(), 1000)
                .unwrap();

            let owner = registry.get_owner(test_identifier());
            assert_eq!(owner, Some(accounts.alice));
        }

        #[ink::test]
        fn lookup_returns_none_for_unknown() {
            let registry = Registry::new();
            assert_eq!(registry.lookup([99u8; 32]), None);
        }

        #[ink::test]
        fn cannot_register_twice() {
            let mut registry = Registry::new();
            let accounts = default_accounts();
            set_caller(accounts.alice);

            registry
                .register(test_identifier(), test_spending_key(), test_viewing_key(), 1000)
                .unwrap();

            let result = registry.register(
                test_identifier(),
                [4u8; 32], // different keys
                [5u8; 32],
                2000,
            );

            assert_eq!(result, Err(RegistryError::IdentifierAlreadyRegistered));
        }

        #[ink::test]
        fn update_chain_works() {
            let mut registry = Registry::new();
            let accounts = default_accounts();
            set_caller(accounts.alice);

            registry
                .register(test_identifier(), test_spending_key(), test_viewing_key(), 1000)
                .unwrap();

            let result = registry.update_preferred_chain(test_identifier(), 2000);
            assert!(result.is_ok());

            let meta = registry.lookup(test_identifier()).unwrap();
            assert_eq!(meta.preferred_chain, 2000);
        }

        #[ink::test]
        fn only_owner_can_update() {
            let mut registry = Registry::new();
            let accounts = default_accounts();

            // Alice registers
            set_caller(accounts.alice);
            registry
                .register(test_identifier(), test_spending_key(), test_viewing_key(), 1000)
                .unwrap();

            // Bob tries to update
            set_caller(accounts.bob);
            let result = registry.update_preferred_chain(test_identifier(), 2000);

            assert_eq!(result, Err(RegistryError::NotOwner));

            // Verify chain wasn't changed
            let meta = registry.lookup(test_identifier()).unwrap();
            assert_eq!(meta.preferred_chain, 1000);
        }

        #[ink::test]
        fn update_fails_for_unknown_identifier() {
            let mut registry = Registry::new();
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let result = registry.update_preferred_chain([99u8; 32], 2000);
            assert_eq!(result, Err(RegistryError::NotFound));
        }
    }
}
