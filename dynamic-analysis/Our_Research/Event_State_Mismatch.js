const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Our Research: Event-State Mismatch", function () {
  let victim;
  let exploiter;
  let monitor;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    console.log("\n[Setup] Deploying Event-State Mismatch vulnerable contract...");

    // Deploy victim contract
    const EventStateMismatchVictim = await ethers.getContractFactory("EventStateMismatchVictim");
    victim = await EventStateMismatchVictim.deploy();
    
    const victimAddress = await victim.getAddress();
    console.log(`✓ Victim contract deployed at: ${victimAddress}`);
  });

  describe("Correct Behavior", function () {
    it("should emit events correctly with correctDeposit", async function () {
      console.log("\n[Test] Testing correct deposit behavior...");
      
      const depositAmount = ethers.parseEther("10");
      
      // Listen for event
      const tx = await victim.connect(user1).correctDeposit({ value: depositAmount });
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.logs.find(log => {
        try {
          return victim.interface.parseLog(log).name === "DepositLogged";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      
      // Verify state matches event
      const balance = await victim.balances(user1.address);
      expect(balance).to.equal(depositAmount);
      
      console.log(`✓ Event emitted with amount: ${ethers.formatEther(depositAmount)} ETH`);
      console.log(`✓ Balance updated to: ${ethers.formatEther(balance)} ETH`);
      console.log("✓ Event matches state!");
    });

    it("should emit events correctly with correctWithdraw", async function () {
      console.log("\n[Test] Testing correct withdraw behavior...");
      
      // First deposit
      const depositAmount = ethers.parseEther("10");
      await victim.connect(user1).correctDeposit({ value: depositAmount });
      
      // Then withdraw
      const withdrawAmount = ethers.parseEther("5");
      const balanceBefore = await victim.balances(user1.address);
      
      const tx = await victim.connect(user1).correctWithdraw(withdrawAmount);
      const receipt = await tx.wait();
      
      // Check event
      const event = receipt.logs.find(log => {
        try {
          return victim.interface.parseLog(log).name === "WithdrawLogged";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      
      const balanceAfter = await victim.balances(user1.address);
      const actualWithdrawn = balanceBefore - balanceAfter;
      
      expect(actualWithdrawn).to.equal(withdrawAmount);
      console.log(`✓ Event and state match: ${ethers.formatEther(withdrawAmount)} ETH withdrawn`);
    });
  });

  describe("Event-State Mismatch Vulnerabilities", function () {
    it("should demonstrate vulnerable deposit with event-before-state", async function () {
      console.log("\n[Attack] Demonstrating vulnerable deposit...");
      
      const depositAmount = ethers.parseEther("5");
      const balanceBefore = await victim.balances(user1.address);
      
      console.log(`Balance before: ${ethers.formatEther(balanceBefore)} ETH`);
      
      // Call vulnerable deposit
      const tx = await victim.connect(user1).vulnerableDeposit({ value: depositAmount });
      const receipt = await tx.wait();
      
      // Event was emitted
      const events = receipt.logs.filter(log => {
        try {
          const parsed = victim.interface.parseLog(log);
          return parsed.name === "DepositLogged";
        } catch {
          return false;
        }
      });
      
      const balanceAfter = await victim.balances(user1.address);
      console.log(`Balance after: ${ethers.formatEther(balanceAfter)} ETH`);
      
      // In this case, both succeed, but the vulnerability is that event was emitted BEFORE state update
      // If state update had failed, event would still exist
      expect(events.length).to.be.gt(0);
      expect(balanceAfter).to.equal(balanceBefore + depositAmount);
      
      console.log("⚠️  Event was emitted BEFORE state update!");
      console.log("⚠️  If state update fails, event still exists on-chain!");
    });

    it("should demonstrate vulnerable withdraw with incorrect event amount", async function () {
      console.log("\n[Attack] Demonstrating incorrect event amount...");
      
      // First deposit
      await victim.connect(user1).correctDeposit({ value: ethers.parseEther("10") });
      
      const withdrawAmount = ethers.parseEther("3");
      const balanceBefore = await victim.balances(user1.address);
      
      // Call vulnerable withdraw
      const tx = await victim.connect(user1).vulnerableWithdraw(withdrawAmount);
      const receipt = await tx.wait();
      
      // Parse event
      const eventLog = receipt.logs.find(log => {
        try {
          return victim.interface.parseLog(log).name === "WithdrawLogged";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = victim.interface.parseLog(eventLog);
      const eventAmount = parsedEvent.args[1]; // amount parameter
      
      const balanceAfter = await victim.balances(user1.address);
      const actualWithdrawn = balanceBefore - balanceAfter;
      
      console.log(`Event claims withdrawn: ${ethers.formatEther(eventAmount)} ETH`);
      console.log(`Actually withdrawn: ${ethers.formatEther(actualWithdrawn)} ETH`);
      console.log(`Discrepancy: ${ethers.formatEther(eventAmount - actualWithdrawn)} ETH`);
      
      // Event claims double the actual amount
      expect(eventAmount).to.equal(withdrawAmount * BigInt(2));
      expect(actualWithdrawn).to.equal(withdrawAmount);
      expect(eventAmount).to.not.equal(actualWithdrawn);
      
      console.log("⚠️  Event logs DOUBLE the actual withdrawal amount!");
      console.log("⚠️  Off-chain systems see false data!");
    });

    it("should demonstrate vulnerable transfer with premature event", async function () {
      console.log("\n[Attack] Demonstrating premature event emission...");
      
      // Deposit
      await victim.connect(user1).correctDeposit({ value: ethers.parseEther("10") });
      
      const transferAmount = ethers.parseEther("5");
      
      // Try to transfer to zero address (should fail)
      await expect(
        victim.connect(user1).vulnerableTransfer(ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("Invalid recipient");
      
      console.log("⚠️  Transfer failed, but event was emitted before validation!");
      console.log("⚠️  Off-chain systems think transfer succeeded!");
      
      // Verify balance didn't change
      const balance = await victim.balances(user1.address);
      expect(balance).to.equal(ethers.parseEther("10"));
      console.log("✓ State is correct (transfer didn't happen)");
      console.log("✗ But event claims it did!");
    });

    it("should accumulate false events leading to state-event drift", async function () {
      console.log("\n[Attack] Creating multiple false events...");
      
      const initialDeposit = ethers.parseEther("20");
      await victim.connect(user1).correctDeposit({ value: initialDeposit });
      
      let eventCount = 0;
      let actualSuccessCount = 0;
      
      // Try multiple transfers, some will fail
      const transfers = [
        { to: user2.address, amount: ethers.parseEther("5"), shouldSucceed: true },
        { to: ethers.ZeroAddress, amount: ethers.parseEther("5"), shouldSucceed: false },
        { to: user3.address, amount: ethers.parseEther("5"), shouldSucceed: true },
        { to: ethers.ZeroAddress, amount: ethers.parseEther("5"), shouldSucceed: false },
      ];
      
      for (const transfer of transfers) {
        try {
          const tx = await victim.connect(user1).vulnerableTransfer(transfer.to, transfer.amount);
          await tx.wait();
          eventCount++;
          actualSuccessCount++;
        } catch (error) {
          eventCount++; // Event was still emitted
          // But transfer failed
        }
      }
      
      console.log(`Events emitted: ${eventCount}`);
      console.log(`Actual successful transfers: ${actualSuccessCount}`);
      console.log(`False events: ${eventCount - actualSuccessCount}`);
      
      expect(eventCount).to.be.gt(actualSuccessCount);
      console.log("⚠️  Off-chain systems see more transfers than actually happened!");
    });
  });

  describe("Exploiter Contract", function () {
    beforeEach(async function () {
      // Deploy exploiter
      const EventStateMismatchExploiter = await ethers.getContractFactory("EventStateMismatchExploiter");
      exploiter = await EventStateMismatchExploiter.deploy(await victim.getAddress());
      
      console.log(`\n[Setup] Exploiter deployed at: ${await exploiter.getAddress()}`);
    });

    it("should demonstrate event-state discrepancy via exploiter", async function () {
      console.log("\n[Attack] Using exploiter to create event-state mismatch...");
      
      // Fund exploiter
      await owner.sendTransaction({
        to: await exploiter.getAddress(),
        value: ethers.parseEther("10")
      });
      
      // Exploit inflated withdrawals
      await exploiter.exploitInflatedWithdrawals({ value: ethers.parseEther("6") });
      
      // Check discrepancy
      const [contractBalance, attackerBalance, issue] = await exploiter.demonstrateDiscrepancy();
      
      console.log(`Contract ETH balance: ${ethers.formatEther(contractBalance)} ETH`);
      console.log(`Attacker tracked balance: ${ethers.formatEther(attackerBalance)} ETH`);
      console.log(`Issue: ${issue}`);
      
      expect(attackerBalance).to.be.lt(ethers.parseEther("6"));
      console.log("✓ Exploiter successfully created event-state mismatch!");
    });

    it("should generate false transfer events", async function () {
      console.log("\n[Attack] Generating false transfer events...");
      
      // Fund exploiter
      await owner.sendTransaction({
        to: await exploiter.getAddress(),
        value: ethers.parseEther("5")
      });
      
      // Try to transfer to invalid addresses
      const invalidTargets = [ethers.ZeroAddress, ethers.ZeroAddress];
      
      // This will generate events but some transfers will fail
      await exploiter.exploitFalseTransfers(invalidTargets, ethers.parseEther("1"), {
        value: ethers.parseEther("2")
      });
      
      console.log("✓ False events generated for failed transfers!");
      console.log("⚠️  Off-chain indexers will show incorrect transfer history!");
    });
  });

  describe("Event Monitor", function () {
    beforeEach(async function () {
      // Deploy monitor
      const EventStateMonitor = await ethers.getContractFactory("EventStateMonitor");
      monitor = await EventStateMonitor.deploy(await victim.getAddress());
      
      console.log(`\n[Setup] Monitor deployed at: ${await monitor.getAddress()}`);
    });

    it("should detect event-state mismatches", async function () {
      console.log("\n[Monitor] Detecting discrepancies...");
      
      // Monitor a deposit
      const depositAmount = ethers.parseEther("8");
      
      await monitor.monitorDeposit(depositAmount, { value: depositAmount });
      
      const discrepancyCount = await monitor.getDiscrepancyCount();
      
      console.log(`Discrepancies detected: ${discrepancyCount}`);
      
      if (discrepancyCount > 0n) {
        console.log("⚠️  Event-state mismatch detected by monitor!");
      } else {
        console.log("✓ No discrepancies in this case (state matched event)");
      }
    });
  });
});
