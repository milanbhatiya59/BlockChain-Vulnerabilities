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

  // ===== SC02: Price Oracle Manipulation =====
  console.log("\n[SC02] Deploying Price Oracle Manipulation Demo...");

  // Deploy VulnerableDEX with 100 ETH initial liquidity
  const VulnerableDEX = await ethers.getContractFactory("VulnerableDEX");
  const vulnerableDEX = await VulnerableDEX.deploy({
    value: ethers.parseEther("100.0"),
  });
  await vulnerableDEX.waitForDeployment();
  const dexAddress = await vulnerableDEX.getAddress();
  console.log(`✓ VulnerableDEX deployed to: ${dexAddress}`);

  // Deploy PriceManipulationAttacker
  const PriceManipulationAttacker = await ethers.getContractFactory(
    "PriceManipulationAttacker"
  );
  const priceAttacker = await PriceManipulationAttacker.deploy(dexAddress);
  await priceAttacker.waitForDeployment();
  const priceAttackerAddress = await priceAttacker.getAddress();
  console.log(
    `✓ PriceManipulationAttacker deployed to: ${priceAttackerAddress}`
  );

  console.log("-".repeat(60));

  // ===== SC03: Logic Errors =====
  console.log("\n[SC03] Deploying Logic Error Vulnerability Demo...");

  // Deploy UnfairDistribution
  const UnfairDistribution = await ethers.getContractFactory(
    "UnfairDistribution"
  );
  const unfairDistribution = await UnfairDistribution.deploy();
  await unfairDistribution.waitForDeployment();
  const unfairDistributionAddress = await unfairDistribution.getAddress();
  console.log(`✓ UnfairDistribution deployed to: ${unfairDistributionAddress}`);

  // Deploy LogicErrorExploiter
  const LogicErrorExploiter = await ethers.getContractFactory(
    "LogicErrorExploiter"
  );
  const logicErrorExploiter = await LogicErrorExploiter.deploy(
    unfairDistributionAddress
  );
  await logicErrorExploiter.waitForDeployment();
  const logicErrorExploiterAddress = await logicErrorExploiter.getAddress();
  console.log(
    `✓ LogicErrorExploiter deployed to: ${logicErrorExploiterAddress}`
  );

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
  console.log("\nSC02 - Price Oracle Manipulation:");
  console.log(`  VulnerableDEX: ${dexAddress}`);
  console.log(`  PriceManipulationAttacker: ${priceAttackerAddress}`);
  console.log("\nSC03 - Logic Errors:");
  console.log(`  UnfairDistribution: ${unfairDistributionAddress}`);
  console.log(`  LogicErrorExploiter: ${logicErrorExploiterAddress}`);
  console.log("\nSC05 - Reentrancy:");
  console.log(`  VulnerableBank: ${bankAddress}`);
  console.log(`  Attacker: ${attackerAddress}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
