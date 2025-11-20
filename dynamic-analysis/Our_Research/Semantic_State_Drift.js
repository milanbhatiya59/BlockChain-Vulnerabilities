const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Our Research: Semantic State Drift", function () {
  let victim;
  let exploiter;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    console.log("\n[Setup] Deploying Semantic State Drift vulnerable contract...");

    // Deploy victim contract with initial balance
    const SemanticStateDriftVictim = await ethers.getContractFactory("SemanticStateDriftVictim");
    victim = await SemanticStateDriftVictim.deploy({
      value: ethers.parseEther("1000")
    });
    
    const victimAddress = await victim.getAddress();
    console.log(`✓ Victim contract deployed at: ${victimAddress}`);
    console.log(`Initial totalDeposits: ${ethers.formatEther(await victim.totalDeposits())} ETH`);
    console.log(`Owner balance: ${ethers.formatEther(await victim.balances(owner.address))} ETH`);
  });

  describe("Correct Behavior", function () {
    it("should maintain invariant with deposit and withdraw", async function () {
      console.log("\n[Test] Testing correct deposit/withdraw behavior...");
      
      // User deposits
      await victim.connect(user1).deposit({ value: ethers.parseEther("100") });
      await victim.connect(user2).deposit({ value: ethers.parseEther("200") });
      
      const addresses = [owner.address, user1.address, user2.address];
      const totalDeposits = await victim.totalDeposits();
      const actualSum = await victim.computeSum(addresses);
      
      console.log(`Total deposits: ${ethers.formatEther(totalDeposits)} ETH`);
      console.log(`Actual sum: ${ethers.formatEther(actualSum)} ETH`);
      
      // Invariant should hold
      expect(totalDeposits).to.equal(actualSum);
      console.log("✓ Invariant holds: totalDeposits == sum(balances)");
    });

    it("should maintain invariant with adminReward", async function () {
      console.log("\n[Test] Testing adminReward...");
      
      await victim.adminReward(user1.address, ethers.parseEther("50"));
      
      const addresses = [owner.address, user1.address];
      const totalDeposits = await victim.totalDeposits();
      const actualSum = await victim.computeSum(addresses);
      
      console.log(`Total deposits after reward: ${ethers.formatEther(totalDeposits)} ETH`);
      console.log(`Actual sum: ${ethers.formatEther(actualSum)} ETH`);
      
      expect(totalDeposits).to.equal(actualSum);
      console.log("✓ Invariant holds after admin reward");
    });
  });

  describe("Semantic State Drift Vulnerability", function () {
    it("should demonstrate drift with transferWithFee", async function () {
      console.log("\n[Attack] Demonstrating semantic state drift...");
      
      // Setup: Give balances to users
      await victim.adminReward(user1.address, ethers.parseEther("500"));
      await victim.adminReward(user2.address, ethers.parseEther("500"));
      
      const addresses = [owner.address, user1.address, user2.address];
      
      // Check invariant before
      const totalBefore = await victim.totalDeposits();
      const sumBefore = await victim.computeSum(addresses);
      console.log(`\nBefore drift:`);
      console.log(`  Total deposits: ${ethers.formatEther(totalBefore)} ETH`);
      console.log(`  Actual sum: ${ethers.formatEther(sumBefore)} ETH`);
      console.log(`  Invariant holds: ${totalBefore === sumBefore}`);
      
      expect(totalBefore).to.equal(sumBefore);
      
      // Exploit: Use transferWithFee which creates drift
      console.log(`\nCreating drift via transferWithFee...`);
      await victim.connect(user1).transferWithFee(
        user2.address,
        ethers.parseEther("100"),
        ethers.parseEther("10") // Fee is deducted from balance but NOT from totalDeposits
      );
      
      // Check invariant after
      const totalAfter = await victim.totalDeposits();
      const sumAfter = await victim.computeSum(addresses);
      const drift = totalAfter - sumAfter;
      
      console.log(`\nAfter drift:`);
      console.log(`  Total deposits: ${ethers.formatEther(totalAfter)} ETH`);
      console.log(`  Actual sum: ${ethers.formatEther(sumAfter)} ETH`);
      console.log(`  Drift amount: ${ethers.formatEther(drift)} ETH`);
      console.log(`  Invariant broken: ${totalAfter !== sumAfter}`);
      
      // Invariant should be broken
      expect(totalAfter).to.not.equal(sumAfter);
      expect(drift).to.equal(ethers.parseEther("10")); // Fee amount
      console.log("✓ Semantic state drift successfully demonstrated!");
    });

    it("should accumulate drift with multiple transfers", async function () {
      console.log("\n[Attack] Accumulating drift with multiple transfers...");
      
      // Setup: Give balances to users
      await victim.adminReward(user1.address, ethers.parseEther("500"));
      await victim.adminReward(user2.address, ethers.parseEther("500"));
      await victim.adminReward(user3.address, ethers.parseEther("500"));
      
      const addresses = [owner.address, user1.address, user2.address, user3.address];
      
      const initialTotal = await victim.totalDeposits();
      const initialSum = await victim.computeSum(addresses);
      
      console.log(`Initial state:`);
      console.log(`  Total deposits: ${ethers.formatEther(initialTotal)} ETH`);
      console.log(`  Actual sum: ${ethers.formatEther(initialSum)} ETH`);
      
      // Perform multiple transfers with fees
      const numTransfers = 5;
      const feePerTransfer = ethers.parseEther("5");
      
      console.log(`\nPerforming ${numTransfers} transfers with ${ethers.formatEther(feePerTransfer)} ETH fee each...`);
      
      for (let i = 0; i < numTransfers; i++) {
        await victim.connect(user1).transferWithFee(
          user2.address,
          ethers.parseEther("10"),
          feePerTransfer
        );
      }
      
      const finalTotal = await victim.totalDeposits();
      const finalSum = await victim.computeSum(addresses);
      const totalDrift = finalTotal - finalSum;
      const expectedDrift = feePerTransfer * BigInt(numTransfers);
      
      console.log(`\nFinal state:`);
      console.log(`  Total deposits: ${ethers.formatEther(finalTotal)} ETH`);
      console.log(`  Actual sum: ${ethers.formatEther(finalSum)} ETH`);
      console.log(`  Total drift: ${ethers.formatEther(totalDrift)} ETH`);
      console.log(`  Expected drift: ${ethers.formatEther(expectedDrift)} ETH`);
      
      expect(totalDrift).to.equal(expectedDrift);
      console.log("✓ Drift accumulates correctly with multiple transfers!");
    });
  });

  describe("Exploiter Contract", function () {
    beforeEach(async function () {
      // Deploy exploiter
      const SemanticStateDriftExploiter = await ethers.getContractFactory("SemanticStateDriftExploiter");
      exploiter = await SemanticStateDriftExploiter.deploy(await victim.getAddress());
      
      console.log(`\n[Setup] Exploiter deployed at: ${await exploiter.getAddress()}`);
    });

    it("should exploit drift using the exploiter contract", async function () {
      console.log("\n[Attack] Using exploiter contract to create drift...");
      
      // Setup: Deposit actual ETH for users (not adminReward which doesn't transfer real ETH)
      await victim.connect(user1).deposit({ value: ethers.parseEther("500") });
      await victim.connect(user2).deposit({ value: ethers.parseEther("500") });
      
      const participants = [owner.address, user1.address, user2.address];
      
      // Check initial state
      const [reportedBefore, sumBefore, driftBefore] = await exploiter.demonstrateDrift(participants);
      console.log(`\nBefore exploitation:`);
      console.log(`  Reported total: ${ethers.formatEther(reportedBefore)} ETH`);
      console.log(`  Actual sum: ${ethers.formatEther(sumBefore)} ETH`);
      console.log(`  Drift: ${ethers.formatEther(driftBefore)} ETH`);
      
      expect(driftBefore).to.equal(0);
      
      // Exploit: Use transferWithFee to create drift
      console.log(`\nExecuting drift exploitation via transferWithFee...`);
      
      // Perform transfers with fees to create drift
      for (let i = 0; i < 5; i++) {
        await victim.connect(user1).transferWithFee(
          user2.address,
          ethers.parseEther("10"),
          ethers.parseEther("5")
        );
      }
      
      // Check final state
      const [reportedAfter, sumAfter, driftAfter] = await exploiter.demonstrateDrift(participants);
      console.log(`\nAfter exploitation:`);
      console.log(`  Reported total: ${ethers.formatEther(reportedAfter)} ETH`);
      console.log(`  Actual sum: ${ethers.formatEther(sumAfter)} ETH`);
      console.log(`  Drift: ${ethers.formatEther(driftAfter)} ETH`);
      
      expect(driftAfter).to.be.gt(0);
      expect(driftAfter).to.equal(ethers.parseEther("25")); // 5 transfers * 5 ETH fee each
      console.log("✓ Exploiter successfully demonstrated semantic state drift!");
    });
  });
});
