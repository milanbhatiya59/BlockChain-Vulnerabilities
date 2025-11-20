const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy VulnerableBank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.waitForDeployment();
  const bankAddress = await vulnerableBank.getAddress();
  console.log(`VulnerableBank deployed to: ${bankAddress}`);

  // Deploy Attacker, passing the bank's address to its constructor
  const Attacker = await ethers.getContractFactory("Attacker");
  const attackerContract = await Attacker.deploy(bankAddress);
  await attackerContract.waitForDeployment();
  const attackerAddress = await attackerContract.getAddress();
  console.log(`Attacker contract deployed to: ${attackerAddress}`);

  console.log("\nDeployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
