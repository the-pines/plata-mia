// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRegistry
/// @notice Interface for the stealth meta-address registry
interface IRegistry {
    /// @notice Register a new stealth meta-address
    /// @param identifier Unique identifier hash for the registration
    /// @param spendingKey Public spending key (32 bytes)
    /// @param viewingKey Public viewing key (32 bytes)
    /// @param preferredChain Chain ID for receiving funds
    /// @param nickname Human-readable name for the registration
    function register(
        bytes32 identifier,
        bytes32 spendingKey,
        bytes32 viewingKey,
        uint32 preferredChain,
        string calldata nickname
    ) external;

    /// @notice Look up a stealth meta-address by identifier
    /// @param identifier The identifier to look up
    /// @return spendingKey The spending public key
    /// @return viewingKey The viewing public key
    /// @return preferredChain The preferred chain ID
    /// @return nickname The registration nickname
    /// @return exists Whether the identifier is registered
    function lookup(bytes32 identifier) external view returns (
        bytes32 spendingKey,
        bytes32 viewingKey,
        uint32 preferredChain,
        string memory nickname,
        bool exists
    );

    /// @notice Get the owner of a registration
    /// @param identifier The identifier to query
    /// @return The owner address, or zero if not registered
    function getOwner(bytes32 identifier) external view returns (address);

    /// @notice Update the preferred chain for a registration
    /// @param identifier The identifier to update
    /// @param newChain The new preferred chain ID
    function updatePreferredChain(bytes32 identifier, uint32 newChain) external;

    /// @notice Update the nickname for a registration
    /// @param identifier The identifier to update
    /// @param newNickname The new nickname
    function updateNickname(bytes32 identifier, string calldata newNickname) external;
}
