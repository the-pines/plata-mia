// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IRegistry.sol";

/// @title Registry
/// @notice Stealth meta-address registry for the Plata Mia protocol
/// @dev Stores spending and viewing keys for stealth address generation
contract Registry is IRegistry {
    struct StealthMetaAddress {
        bytes32 spendingKey;
        bytes32 viewingKey;
        uint32 preferredChain;
        string nickname;
    }

    mapping(bytes32 => StealthMetaAddress) private entries;
    mapping(bytes32 => address) private owners;

    /// @notice Emitted when a new stealth meta-address is registered
    event Registered(
        bytes32 indexed identifier,
        address indexed owner,
        bytes32 spendingKey,
        bytes32 viewingKey,
        uint32 preferredChain,
        string nickname
    );

    /// @notice Emitted when preferred chain is updated
    event ChainUpdated(
        bytes32 indexed identifier,
        uint32 oldChain,
        uint32 newChain
    );

    /// @notice Emitted when nickname is updated
    event NicknameUpdated(
        bytes32 indexed identifier,
        string oldNickname,
        string newNickname
    );

    /// @notice Thrown when identifier is already registered
    error IdentifierAlreadyRegistered();

    /// @notice Thrown when identifier is not found
    error NotFound();

    /// @notice Thrown when caller is not the owner
    error NotOwner();

    /// @inheritdoc IRegistry
    function register(
        bytes32 identifier,
        bytes32 spendingKey,
        bytes32 viewingKey,
        uint32 preferredChain,
        string calldata nickname
    ) external {
        if (owners[identifier] != address(0)) {
            revert IdentifierAlreadyRegistered();
        }

        entries[identifier] = StealthMetaAddress({
            spendingKey: spendingKey,
            viewingKey: viewingKey,
            preferredChain: preferredChain,
            nickname: nickname
        });
        owners[identifier] = msg.sender;

        emit Registered(identifier, msg.sender, spendingKey, viewingKey, preferredChain, nickname);
    }

    /// @inheritdoc IRegistry
    function lookup(bytes32 identifier) external view returns (
        bytes32 spendingKey,
        bytes32 viewingKey,
        uint32 preferredChain,
        string memory nickname,
        bool exists
    ) {
        if (owners[identifier] == address(0)) {
            return (bytes32(0), bytes32(0), 0, "", false);
        }
        StealthMetaAddress storage meta = entries[identifier];
        return (meta.spendingKey, meta.viewingKey, meta.preferredChain, meta.nickname, true);
    }

    /// @inheritdoc IRegistry
    function getOwner(bytes32 identifier) external view returns (address) {
        return owners[identifier];
    }

    /// @inheritdoc IRegistry
    function updatePreferredChain(bytes32 identifier, uint32 newChain) external {
        address owner = owners[identifier];
        if (owner == address(0)) {
            revert NotFound();
        }
        if (owner != msg.sender) {
            revert NotOwner();
        }

        uint32 oldChain = entries[identifier].preferredChain;
        entries[identifier].preferredChain = newChain;

        emit ChainUpdated(identifier, oldChain, newChain);
    }

    /// @inheritdoc IRegistry
    function updateNickname(bytes32 identifier, string calldata newNickname) external {
        address owner = owners[identifier];
        if (owner == address(0)) {
            revert NotFound();
        }
        if (owner != msg.sender) {
            revert NotOwner();
        }

        string memory oldNickname = entries[identifier].nickname;
        entries[identifier].nickname = newNickname;

        emit NicknameUpdated(identifier, oldNickname, newNickname);
    }
}
