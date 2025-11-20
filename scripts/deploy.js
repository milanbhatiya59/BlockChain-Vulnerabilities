const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");
  console.log("=".repeat(60));

  // ===== SC01: Access Control Vulnerabilities =====
  console.log("\n[SC01] Deploying Access Control Vulnerability Demo...");

  // Deploy VulnerableWallet
  const VulnerableWallet = await ethers.getContractFactory("VulnerableWallet");
  const vulnerableWallet = await VulnerableWallet.deploy();
  await vulnerableWallet.waitForDeployment();
  const walletAddress = await vulnerableWallet.getAddress();
  console.log(`✓ VulnerableWallet deployed to: ${walletAddress}`);

  // Deploy AccessControlAttacker
  const AccessControlAttacker = await ethers.getContractFactory(
    "AccessControlAttacker"
  );
  const accessAttacker = await AccessControlAttacker.deploy(walletAddress);
  await accessAttacker.waitForDeployment();
  const accessAttackerAddress = await accessAttacker.getAddress();
  console.log(`✓ AccessControlAttacker deployed to: ${accessAttackerAddress}`);

  console.log("-".repeat(60));

  // ===== SC05: Reentrancy Attack =====
  console.log("\n[SC05] Deploying Reentrancy Vulnerability Demo...");
  
  // Deploy VulnerableBank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.waitForDeployment();
  const bankAddress = await vulnerableBank.getAddress();
  console.log(`✓ VulnerableBank deployed to: ${bankAddress}`);

  // Deploy Attacker, passing the bank's address to its constructor
  const Attacker = await ethers.getContractFactory("Attacker");
  const attackerContract = await Attacker.deploy(bankAddress);
  await attackerContract.waitForDeployment();
  const attackerAddress = await attackerContract.getAddress();
  console.log(`✓ Attacker contract deployed to: ${attackerAddress}`);

  console.log("=".repeat(60));
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("SC01 - Access Control:");
  console.log(`  VulnerableWallet: ${walletAddress}`);
  console.log(`  AccessControlAttacker: ${accessAttackerAddress}`);
  console.log("\nSC05 - Reentrancy:");
  console.log(`  VulnerableBank: ${bankAddress}`);
  console.log(`  Attacker: ${attackerAddress}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
