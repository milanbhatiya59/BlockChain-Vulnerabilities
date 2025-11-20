const { ethers } = require("hardhat");
const fc = require("fast-check");
const { expect } = require("chai");

describe("Access Control Fuzzing", function () {
  let VulnerableWallet, AccessControlAttacker;
  let owner, user1, attackerSigner;

  before(async () => {
    [owner, user1, attackerSigner] = await ethers.getSigners();
    VulnerableWallet = await ethers.getContractFactory("VulnerableWallet");
    AccessControlAttacker = await ethers.getContractFactory("AccessControlAttacker");
  });

  it("should allow unauthorized ownership change with random deposit amounts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (ownerDepositAmount, userDepositAmount) => {
          // Deploy contracts for each test run
          const vulnerableWallet = await VulnerableWallet.deploy();
          await vulnerableWallet.waitForDeployment();
          const walletAddress = await vulnerableWallet.getAddress();

          const attackerContract = await AccessControlAttacker.deploy(walletAddress);
          await attackerContract.waitForDeployment();

          // Fund the wallet from owner
          const ownerDepositTx = await vulnerableWallet
            .connect(owner)
            .deposit({ value: ethers.parseEther(ownerDepositAmount.toString()) });
          await ownerDepositTx.wait();

          // Fund the wallet from another user
          const userDepositTx = await vulnerableWallet
            .connect(user1)
            .deposit({ value: ethers.parseEther(userDepositAmount.toString()) });
          await userDepositTx.wait();

          // Verify initial owner
          const initialOwner = await vulnerableWallet.owner();
          expect(initialOwner).to.equal(owner.address);

          // Perform the ownership attack
          const attackTx = await attackerContract
            .connect(attackerSigner)
            .attackChangeOwner();
          await attackTx.wait();

          // Verify ownership was changed
          const newOwner = await vulnerableWallet.owner();
          expect(newOwner).to.equal(await attackerContract.getAddress());
          expect(newOwner).to.not.equal(initialOwner);
        }
      )
    );
  }).timeout(20000);

  it("should allow unauthorized fund drainage with random deposit amounts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (ownerDepositAmount, userDepositAmount) => {
          // Deploy contracts for each test run
          const vulnerableWallet = await VulnerableWallet.deploy();
          await vulnerableWallet.waitForDeployment();
          const walletAddress = await vulnerableWallet.getAddress();

          const attackerContract = await AccessControlAttacker.deploy(walletAddress);
          await attackerContract.waitForDeployment();

          // Fund the wallet from owner
          const ownerDepositTx = await vulnerableWallet
            .connect(owner)
            .deposit({ value: ethers.parseEther(ownerDepositAmount.toString()) });
          await ownerDepositTx.wait();

          // Fund the wallet from another user
          const userDepositTx = await vulnerableWallet
            .connect(user1)
            .deposit({ value: ethers.parseEther(userDepositAmount.toString()) });
          await userDepositTx.wait();

          // Check initial balances
          const initialWalletBalance = await ethers.provider.getBalance(walletAddress);
          const totalExpected = ethers.parseEther(
            (ownerDepositAmount + userDepositAmount).toString()
          );
          expect(initialWalletBalance).to.equal(totalExpected);

          // Perform the emergency withdraw attack
          const attackTx = await attackerContract
            .connect(attackerSigner)
            .attackEmergencyWithdraw();
          await attackTx.wait();

          // Verify wallet was drained
          const finalWalletBalance = await ethers.provider.getBalance(walletAddress);
          expect(finalWalletBalance).to.equal(0);

          // Verify attacker received all funds
          const attackerBalance = await ethers.provider.getBalance(
            await attackerContract.getAddress()
          );
          expect(attackerBalance).to.equal(totalExpected);
        }
      )
    );
  }).timeout(20000);

  it("should allow full attack: ownership change + fund drainage", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }),
        async (depositAmount) => {
          // Deploy contracts for each test run
          const vulnerableWallet = await VulnerableWallet.deploy();
          await vulnerableWallet.waitForDeployment();
          const walletAddress = await vulnerableWallet.getAddress();

          const attackerContract = await AccessControlAttacker.deploy(walletAddress);
          await attackerContract.waitForDeployment();

          // Fund the wallet from multiple users
          const fundTx1 = await vulnerableWallet
            .connect(owner)
            .deposit({ value: ethers.parseEther(depositAmount.toString()) });
          await fundTx1.wait();

          const fundTx2 = await vulnerableWallet
            .connect(user1)
            .deposit({ value: ethers.parseEther("5.0") });
          await fundTx2.wait();

          // Verify initial state
          const initialOwner = await vulnerableWallet.owner();
          const initialBalance = await ethers.provider.getBalance(walletAddress);
          
          expect(initialOwner).to.equal(owner.address);
          expect(initialBalance).to.be.greaterThan(0);

          // Perform the full attack
          const attackTx = await attackerContract
            .connect(attackerSigner)
            .fullAttack();
          await attackTx.wait();

          // Verify ownership was changed
          const newOwner = await vulnerableWallet.owner();
          expect(newOwner).to.equal(await attackerContract.getAddress());

          // Verify wallet was drained
          const finalBalance = await ethers.provider.getBalance(walletAddress);
          expect(finalBalance).to.equal(0);

          // Verify attacker has the funds
          const attackerBalance = await ethers.provider.getBalance(
            await attackerContract.getAddress()
          );
          expect(attackerBalance).to.equal(initialBalance);
        }
      )
    );
  }).timeout(20000);
});
