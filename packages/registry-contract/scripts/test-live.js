const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Error: CONTRACT_ADDRESS not set");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Testing with account:", signer.address);

  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "PAS\n");

  const Registry = await hre.ethers.getContractFactory("Registry");
  const registry = Registry.attach(contractAddress);

  const testId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("live-test-" + Date.now()));
  const spendingKey = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("spending-key-test"));
  const viewingKey = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("viewing-key-test"));
  const chainId = 420420417;
  const nickname = "testuser";

  console.log("1. Registering stealth meta-address...");
  console.log("   identifier:", testId);
  const tx1 = await registry.register(testId, spendingKey, viewingKey, chainId, nickname);
  const receipt1 = await tx1.wait();
  console.log("   tx:", receipt1.hash);
  console.log("   status: success\n");

  console.log("2. Looking up registration...");
  const result = await registry.lookup(testId);
  console.log("   spendingKey:", result.spendingKey);
  console.log("   viewingKey:", result.viewingKey);
  console.log("   preferredChain:", result.preferredChain.toString());
  console.log("   nickname:", result.nickname);
  console.log("   exists:", result.exists, "\n");

  console.log("3. Checking owner...");
  const owner = await registry.getOwner(testId);
  console.log("   owner:", owner);
  console.log("   matches signer:", owner === signer.address, "\n");

  console.log("4. Updating preferred chain...");
  const tx2 = await registry.updatePreferredChain(testId, 1);
  const receipt2 = await tx2.wait();
  console.log("   tx:", receipt2.hash);
  const updated = await registry.lookup(testId);
  console.log("   new preferredChain:", updated.preferredChain.toString(), "\n");

  console.log("5. Updating nickname...");
  const tx3 = await registry.updateNickname(testId, "updated-nick");
  const receipt3 = await tx3.wait();
  console.log("   tx:", receipt3.hash);
  const final = await registry.lookup(testId);
  console.log("   new nickname:", final.nickname, "\n");

  console.log("All live tests passed!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
