// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Registry {
    struct StealthMetaAddress {
        bytes32 spendingKey;
        bytes32 viewingKey;
        uint32 preferredChain;
        string nickname;
    }

    mapping(bytes32 => StealthMetaAddress) private entries;
    mapping(bytes32 => address) private owners;

    event Registered(
        bytes32 indexed identifier,
        address indexed owner,
        bytes32 spendingKey,
        bytes32 viewingKey,
        uint32 preferredChain,
        string nickname
    );

    event ChainUpdated(
        bytes32 indexed identifier,
        uint32 oldChain,
        uint32 newChain
    );

    event NicknameUpdated(
        bytes32 indexed identifier,
        string oldNickname,
        string newNickname
    );

    error IdentifierAlreadyRegistered();
    error NotFound();
    error NotOwner();

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

    function getOwner(bytes32 identifier) external view returns (address) {
        return owners[identifier];
    }

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
