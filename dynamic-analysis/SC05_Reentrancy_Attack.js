const { ethers } = require("hardhat");
const fc = require("fast-check");
const { expect } = require("chai");

describe("Reentrancy Fuzzing", function () {
  let VulnerableBank, Attacker;
  let owner, attackerSigner;

  before(async () => {
    [owner, attackerSigner] = await ethers.getSigners();
    VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    Attacker = await ethers.getContractFactory("Attacker");
  });

  it("should drain the bank's funds when the attacker deposits a random amount", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (depositAmount) => {
          // Deploy contracts for each test run
          const vulnerableBank = await VulnerableBank.deploy();
          await vulnerableBank.waitForDeployment();
          const bankAddress = await vulnerableBank.getAddress();

          const attackerContract = await Attacker.deploy(bankAddress);
          await attackerContract.waitForDeployment();

          // Fund the bank
          const fundTx = await vulnerableBank
            .connect(owner)
            .deposit({ value: ethers.parseEther("10.0") });
          await fundTx.wait();

          // Perform the attack with a random deposit amount
          const attackAmount = ethers.parseEther(depositAmount.toString());
          const attackTx = await attackerContract
            .connect(attackerSigner)
            .attack({ value: attackAmount });
          await attackTx.wait();

          // Check if the bank is significantly drained (allowing for some remaining dust)
          const bankBalance = await ethers.provider.getBalance(bankAddress);
          const attackerBalance = await ethers.provider.getBalance(
            await attackerContract.getAddress()
          );

          // The bank should be drained or have very little left (less than the attack amount)
          expect(bankBalance).to.be.lessThan(attackAmount);
          // The attacker should have received at least 10 ETH (the initial bank funding)
          expect(attackerBalance).to.be.greaterThanOrEqual(
            ethers.parseEther("10.0")
          );
        }
      )
    );
  }).timeout(20000); // Increase timeout for fuzz testing
});
