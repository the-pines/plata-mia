const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Registry", function () {
  let registry;
  let owner;
  let other;

  const testIdentifier = ethers.keccak256(ethers.toUtf8Bytes("test-user"));
  const spendingKey = ethers.keccak256(ethers.toUtf8Bytes("spending-key"));
  const viewingKey = ethers.keccak256(ethers.toUtf8Bytes("viewing-key"));
  const preferredChain = 1000;
  const nickname = "alice";

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });

  describe("register", function () {
    it("should register a new stealth meta-address", async function () {
      await registry.register(
        testIdentifier,
        spendingKey,
        viewingKey,
        preferredChain,
        nickname
      );

      const result = await registry.lookup(testIdentifier);
      expect(result.spendingKey).to.equal(spendingKey);
      expect(result.viewingKey).to.equal(viewingKey);
      expect(result.preferredChain).to.equal(preferredChain);
      expect(result.nickname).to.equal(nickname);
      expect(result.exists).to.equal(true);
    });

    it("should set the caller as owner", async function () {
      await registry.register(
        testIdentifier,
        spendingKey,
        viewingKey,
        preferredChain,
        nickname
      );

      expect(await registry.getOwner(testIdentifier)).to.equal(owner.address);
    });

    it("should emit Registered event", async function () {
      await expect(
        registry.register(
          testIdentifier,
          spendingKey,
          viewingKey,
          preferredChain,
          nickname
        )
      )
        .to.emit(registry, "Registered")
        .withArgs(
          testIdentifier,
          owner.address,
          spendingKey,
          viewingKey,
          preferredChain,
          nickname
        );
    });

    it("should revert if identifier already registered", async function () {
      await registry.register(
        testIdentifier,
        spendingKey,
        viewingKey,
        preferredChain,
        nickname
      );

      await expect(
        registry.register(
          testIdentifier,
          spendingKey,
          viewingKey,
          preferredChain,
          "different"
        )
      ).to.be.revertedWithCustomError(registry, "IdentifierAlreadyRegistered");
    });
  });

  describe("lookup", function () {
    it("should return exists=false for unknown identifier", async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      const result = await registry.lookup(unknownId);
      expect(result.exists).to.equal(false);
    });
  });

  describe("getOwner", function () {
    it("should return zero address for unknown identifier", async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      expect(await registry.getOwner(unknownId)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("updatePreferredChain", function () {
    beforeEach(async function () {
      await registry.register(
        testIdentifier,
        spendingKey,
        viewingKey,
        preferredChain,
        nickname
      );
    });

    it("should update preferred chain", async function () {
      const newChain = 2000;
      await registry.updatePreferredChain(testIdentifier, newChain);

      const result = await registry.lookup(testIdentifier);
      expect(result.preferredChain).to.equal(newChain);
    });

    it("should emit ChainUpdated event", async function () {
      const newChain = 2000;
      await expect(registry.updatePreferredChain(testIdentifier, newChain))
        .to.emit(registry, "ChainUpdated")
        .withArgs(testIdentifier, preferredChain, newChain);
    });

    it("should revert if not owner", async function () {
      await expect(
        registry.connect(other).updatePreferredChain(testIdentifier, 2000)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("should revert if identifier not found", async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        registry.updatePreferredChain(unknownId, 2000)
      ).to.be.revertedWithCustomError(registry, "NotFound");
    });
  });

  describe("updateNickname", function () {
    beforeEach(async function () {
      await registry.register(
        testIdentifier,
        spendingKey,
        viewingKey,
        preferredChain,
        nickname
      );
    });

    it("should update nickname", async function () {
      const newNickname = "bob";
      await registry.updateNickname(testIdentifier, newNickname);

      const result = await registry.lookup(testIdentifier);
      expect(result.nickname).to.equal(newNickname);
    });

    it("should emit NicknameUpdated event", async function () {
      const newNickname = "bob";
      await expect(registry.updateNickname(testIdentifier, newNickname))
        .to.emit(registry, "NicknameUpdated")
        .withArgs(testIdentifier, nickname, newNickname);
    });

    it("should revert if not owner", async function () {
      await expect(
        registry.connect(other).updateNickname(testIdentifier, "hacker")
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("should revert if identifier not found", async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        registry.updateNickname(unknownId, "test")
      ).to.be.revertedWithCustomError(registry, "NotFound");
    });
  });
});
