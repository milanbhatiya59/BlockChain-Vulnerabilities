const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Research Paper: Inconsistent State Update - Dynamic Analysis", function () {
    let token;
    let vault;
    let rewardPool;
    let system;
    let stateManipulator;
    let vaultDrainer;
    let rewardPoolExploiter;
    let systemCorruptor;
    let owner;
    let user1;
    let user2;
    let attacker1;
    
    beforeEach(async function () {
        [owner, user1, user2, attacker1] = await ethers.getSigners();
        
        // Deploy victim contracts
        const InconsistentStateToken = await ethers.getContractFactory("InconsistentStateToken");
        token = await InconsistentStateToken.deploy();
        await token.waitForDeployment();
        
        const InconsistentVault = await ethers.getContractFactory("InconsistentVault");
        vault = await InconsistentVault.deploy();
        await vault.waitForDeployment();
        
        const InconsistentRewardPool = await ethers.getContractFactory("InconsistentRewardPool");
        rewardPool = await InconsistentRewardPool.deploy();
        await rewardPool.waitForDeployment();
        
        const StateCorruptionSystem = await ethers.getContractFactory("StateCorruptionSystem");
        system = await StateCorruptionSystem.deploy();
        await system.waitForDeployment();
        
        // Deploy attacker contracts
        const StateManipulator = await ethers.getContractFactory("StateManipulator");
        stateManipulator = await StateManipulator.connect(attacker1).deploy(await token.getAddress());
        await stateManipulator.waitForDeployment();
        
        const VaultDrainer = await ethers.getContractFactory("VaultDrainer");
        vaultDrainer = await VaultDrainer.connect(attacker1).deploy(await vault.getAddress());
        await vaultDrainer.waitForDeployment();
        
        const RewardPoolExploiter = await ethers.getContractFactory("RewardPoolExploiter");
        rewardPoolExploiter = await RewardPoolExploiter.connect(attacker1).deploy(await rewardPool.getAddress());
        await rewardPoolExploiter.waitForDeployment();
        
        const SystemCorruptor = await ethers.getContractFactory("SystemCorruptor");
        systemCorruptor = await SystemCorruptor.connect(attacker1).deploy(await system.getAddress());
        await systemCorruptor.waitForDeployment();
    });
    
    describe("Vulnerability Detection", function () {
        it("Should detect inconsistent state in token after rescueCredit", async function () {
            const initialSupply = await token.totalSupply();
            const initialBalance = await token.balances(await stateManipulator.getAddress());
            
            console.log("    Initial state:");
            console.log("    - Total Supply:", ethers.formatEther(initialSupply), "tokens");
            console.log("    - Attacker Balance:", ethers.formatEther(initialBalance), "tokens");
            
            // Exploit rescueCredit
            const creditAmount = ethers.parseEther("500");
            await stateManipulator.connect(attacker1).exploitRescueCredit(creditAmount);
            
            const finalSupply = await token.totalSupply();
            const finalBalance = await token.balances(await stateManipulator.getAddress());
            
            console.log("    After rescueCredit:");
            console.log("    - Total Supply:", ethers.formatEther(finalSupply), "tokens (unchanged!)");
            console.log("    - Attacker Balance:", ethers.formatEther(finalBalance), "tokens");
            console.log("    ❌ Invariant violated: balance increased but totalSupply unchanged");
            
            expect(finalBalance).to.equal(creditAmount);
            expect(finalSupply).to.equal(initialSupply); // totalSupply unchanged!
            expect(finalBalance).to.be.greaterThan(0);
        });
        
        it("Should detect vault state corruption after emergency withdraw", async function () {
            // Setup: User deposits
            const depositAmount = ethers.parseEther("10");
            await vaultDrainer.connect(attacker1).depositToVault({ value: depositAmount });
            
            const totalDepositsBefore = await vault.totalDeposits();
            const userDepositBefore = await vault.deposits(await vaultDrainer.getAddress());
            
            console.log("    Before emergency withdraw:");
            console.log("    - Total Deposits:", ethers.formatEther(totalDepositsBefore), "ETH");
            console.log("    - User Deposit:", ethers.formatEther(userDepositBefore), "ETH");
            
            // Exploit emergency withdraw
            await vaultDrainer.connect(attacker1).exploitEmergencyWithdraw();
            
            const totalDepositsAfter = await vault.totalDeposits();
            const userDepositAfter = await vault.deposits(await vaultDrainer.getAddress());
            const vaultBalance = await vault.getBalance();
            
            console.log("    After emergency withdraw:");
            console.log("    - Total Deposits:", ethers.formatEther(totalDepositsAfter), "ETH (unchanged!)");
            console.log("    - User Deposit:", ethers.formatEther(userDepositAfter), "ETH");
            console.log("    - Actual Vault Balance:", ethers.formatEther(vaultBalance), "ETH");
            console.log("    ❌ State inconsistency: totalDeposits doesn't reflect withdrawal");
            
            expect(userDepositAfter).to.equal(0);
            expect(totalDepositsAfter).to.equal(totalDepositsBefore); // Still shows old value!
            expect(vaultBalance).to.equal(0); // But actual balance is 0
        });
        
        it("Should detect reward pool state corruption", async function () {
            // Stake some funds
            const stakeAmount = ethers.parseEther("5");
            await rewardPoolExploiter.connect(attacker1).stakeInPool({ value: stakeAmount });
            
            // Add rewards without updating rewardPerToken
            const rewardAmount = ethers.parseEther("2");
            await rewardPoolExploiter.connect(attacker1).triggerInconsistentReward({ value: rewardAmount });
            
            const rewardBalance = await rewardPool.rewardBalance();
            const contractBalance = await rewardPool.getContractBalance();
            const rewardPerToken = await rewardPool.rewardPerToken();
            
            console.log("    Reward pool state:");
            console.log("    - Reward Balance:", ethers.formatEther(rewardBalance), "ETH");
            console.log("    - Contract Balance:", ethers.formatEther(contractBalance), "ETH");
            console.log("    - Reward Per Token:", rewardPerToken.toString());
            console.log("    ❌ Rewards added but rewardPerToken not updated");
            
            expect(rewardBalance).to.equal(rewardAmount);
            expect(rewardPerToken).to.equal(0); // Never updated!
            expect(contractBalance).to.be.greaterThan(rewardBalance);
        });
        
        it("Should detect system-wide state corruption", async function () {
            const systemToken = await system.token();
            const systemVault = await system.vault();
            const systemRewardPool = await system.rewardPool();
            
            console.log("    System components:");
            console.log("    - Token:", systemToken);
            console.log("    - Vault:", systemVault);
            console.log("    - RewardPool:", systemRewardPool);
            
            const initialHealth = await system.systemHealthy();
            console.log("    - Initial Health:", initialHealth);
            
            // Corrupt the system
            await systemCorruptor.connect(attacker1).corruptEntireSystem();
            
            const finalHealth = await system.systemHealthy();
            console.log("    - Final Health:", finalHealth);
            console.log("    ❌ System state corrupted across all components");
            
            expect(initialHealth).to.be.true;
            expect(finalHealth).to.be.false;
        });
        
        it("Should detect phantom token creation", async function () {
            const creditAmount = ethers.parseEther("1000");
            
            const initialSupply = await token.totalSupply();
            
            // Create phantom tokens via rescueCredit
            await stateManipulator.connect(attacker1).exploitRescueCredit(creditAmount);
            
            const attackerBalance = await token.balances(await stateManipulator.getAddress());
            const totalSupply = await token.totalSupply();
            
            console.log("    Phantom token detection:");
            console.log("    - Attacker Balance:", ethers.formatEther(attackerBalance), "tokens");
            console.log("    - Total Supply:", ethers.formatEther(totalSupply), "tokens");
            console.log("    - Phantom tokens:", ethers.formatEther(attackerBalance), "tokens unaccounted");
            console.log("    ❌ Phantom tokens created outside of totalSupply tracking");
            
            // The attacker has tokens but totalSupply didn't increase
            expect(attackerBalance).to.equal(creditAmount);
            expect(totalSupply).to.equal(initialSupply); // totalSupply unchanged
            expect(attackerBalance).to.be.greaterThan(0);
        });
    });
    
    describe("Attack Scenarios", function () {
        it("Should execute token state manipulation attack", async function () {
            const exploitAmount = ethers.parseEther("2000");
            
            console.log("    [ATTACK] Token State Manipulation");
            console.log("    Step 1: Exploit rescueCredit");
            
            await stateManipulator.connect(attacker1).exploitRescueCredit(exploitAmount);
            
            const attackerBalance = await token.balances(await stateManipulator.getAddress());
            const totalSupply = await token.totalSupply();
            
            console.log("    Step 2: Verify state corruption");
            console.log("    - Attacker gained:", ethers.formatEther(attackerBalance), "tokens");
            console.log("    - Total supply unchanged:", ethers.formatEther(totalSupply), "tokens");
            
            // Transfer phantom tokens
            console.log("    Step 3: Transfer phantom tokens to external address");
            await stateManipulator.connect(attacker1).transferPhantomTokens(user1.address, ethers.parseEther("500"));
            
            const user1Balance = await token.balances(user1.address);
            console.log("    - User1 received:", ethers.formatEther(user1Balance), "phantom tokens");
            console.log("    ✓ Attack successful: Phantom tokens circulating");
            
            expect(user1Balance).to.equal(ethers.parseEther("500"));
        });
        
        it("Should execute vault double-withdrawal attack", async function () {
            console.log("    [ATTACK] Vault Double-Withdrawal");
            
            // Initial deposit
            const depositAmount = ethers.parseEther("15");
            console.log("    Step 1: Deposit", ethers.formatEther(depositAmount), "ETH");
            await vaultDrainer.connect(attacker1).depositToVault({ value: depositAmount });
            
            const attackerBalanceBefore = await ethers.provider.getBalance(attacker1.address);
            
            // Emergency withdraw (doesn't update totalDeposits)
            console.log("    Step 2: Emergency withdraw (corrupts totalDeposits)");
            await vaultDrainer.connect(attacker1).exploitEmergencyWithdraw();
            
            const totalDepositsAfter = await vault.totalDeposits();
            console.log("    - TotalDeposits after withdrawal:", ethers.formatEther(totalDepositsAfter), "ETH");
            console.log("    - Should be 0, but still shows:", ethers.formatEther(depositAmount), "ETH");
            
            expect(totalDepositsAfter).to.equal(depositAmount); // Inconsistent!
            
            console.log("    ✓ Attack successful: State corrupted, double-withdrawal possible");
        });
        
        it("Should demonstrate reward theft through state inconsistency", async function () {
            console.log("    [ATTACK] Reward Theft via State Inconsistency");
            
            // Step 1: Stake
            const stakeAmount = ethers.parseEther("10");
            console.log("    Step 1: Stake", ethers.formatEther(stakeAmount), "ETH");
            await rewardPoolExploiter.connect(attacker1).stakeInPool({ value: stakeAmount });
            
            // Step 2: Add rewards (incorrectly)
            const rewardAmount = ethers.parseEther("5");
            console.log("    Step 2: Add", ethers.formatEther(rewardAmount), "ETH rewards (without updating rewardPerToken)");
            await rewardPoolExploiter.connect(attacker1).triggerInconsistentReward({ value: rewardAmount });
            
            const rewardPerToken = await rewardPool.rewardPerToken();
            console.log("    - rewardPerToken:", rewardPerToken.toString(), "(should be updated but isn't)");
            
            // Step 3: Attempt to claim (will fail due to inconsistent state)
            console.log("    Step 3: Attempt to claim rewards");
            await rewardPoolExploiter.connect(attacker1).attemptClaimReward();
            
            console.log("    ✓ Reward system broken: Users can't claim due to state inconsistency");
        });
        
        it("Should execute cascading system corruption", async function () {
            console.log("    [ATTACK] Cascading System Corruption");
            
            console.log("    Step 1: Corrupt token state");
            await systemCorruptor.connect(attacker1).corruptEntireSystem();
            
            const [tokenSupply, vaultDeposits, poolStaked, systemHealthy] = 
                await systemCorruptor.demonstrateUnrecoverableState();
            
            console.log("    Step 2: System state after corruption:");
            console.log("    - Token Supply:", ethers.formatEther(tokenSupply));
            console.log("    - Vault Deposits:", ethers.formatEther(vaultDeposits));
            console.log("    - Pool Staked:", ethers.formatEther(poolStaked));
            console.log("    - System Healthy:", systemHealthy);
            console.log("    ✓ Entire system corrupted, recovery impossible");
            
            expect(systemHealthy).to.be.false;
        });
    });
    
    describe("State Invariant Analysis", function () {
        it("Should analyze token invariant violations", async function () {
            console.log("\n    === Token Invariant Analysis ===");
            console.log("    Expected: sum(balances) == totalSupply");
            
            const initialSupply = await token.totalSupply();
            console.log("    Initial totalSupply:", ethers.formatEther(initialSupply));
            
            // Mint normally (correct)
            await token.mint(user1.address, ethers.parseEther("100"));
            const afterMintSupply = await token.totalSupply();
            const user1Balance = await token.balances(user1.address);
            
            console.log("\n    After normal mint:");
            console.log("    - TotalSupply:", ethers.formatEther(afterMintSupply));
            console.log("    - User1 balance:", ethers.formatEther(user1Balance));
            console.log("    ✓ Invariant maintained");
            
            // Use rescueCredit (incorrect)
            await token.rescueCredit(user2.address, ethers.parseEther("200"));
            const afterRescueSupply = await token.totalSupply();
            const user2Balance = await token.balances(user2.address);
            
            console.log("\n    After rescueCredit:");
            console.log("    - TotalSupply:", ethers.formatEther(afterRescueSupply), "(unchanged!)");
            console.log("    - User2 balance:", ethers.formatEther(user2Balance));
            console.log("    ❌ Invariant VIOLATED");
            console.log("    - Discrepancy:", ethers.formatEther(user2Balance), "tokens unaccounted");
            
            expect(afterRescueSupply).to.equal(afterMintSupply);
            expect(user2Balance).to.equal(ethers.parseEther("200"));
        });
        
        it("Should analyze vault invariant violations", async function () {
            console.log("\n    === Vault Invariant Analysis ===");
            console.log("    Expected: totalDeposits == contract balance");
            
            // Normal deposit
            await vault.connect(user1).deposit({ value: ethers.parseEther("5") });
            const afterDepositTotal = await vault.totalDeposits();
            const afterDepositBalance = await vault.getBalance();
            
            console.log("\n    After normal deposit:");
            console.log("    - TotalDeposits:", ethers.formatEther(afterDepositTotal), "ETH");
            console.log("    - Contract balance:", ethers.formatEther(afterDepositBalance), "ETH");
            console.log("    ✓ Invariant maintained");
            
            expect(afterDepositTotal).to.equal(afterDepositBalance);
            
            // Emergency withdraw (breaks invariant)
            await vault.connect(user1).emergencyWithdraw();
            const afterEmergencyTotal = await vault.totalDeposits();
            const afterEmergencyBalance = await vault.getBalance();
            
            console.log("\n    After emergency withdraw:");
            console.log("    - TotalDeposits:", ethers.formatEther(afterEmergencyTotal), "ETH");
            console.log("    - Contract balance:", ethers.formatEther(afterEmergencyBalance), "ETH");
            console.log("    ❌ Invariant VIOLATED");
            console.log("    - Discrepancy:", ethers.formatEther(afterEmergencyTotal), "ETH ghost deposits");
            
            expect(afterEmergencyTotal).to.be.greaterThan(afterEmergencyBalance);
        });
    });
    
    describe("Impact Assessment", function () {
        it("Should quantify financial impact of state inconsistency", async function () {
            console.log("\n    === Financial Impact Assessment ===");
            
            // Setup multiple victims
            await vault.connect(user1).deposit({ value: ethers.parseEther("20") });
            await vault.connect(user2).deposit({ value: ethers.parseEther("15") });
            
            const totalFunds = await vault.getBalance();
            console.log("    Total funds at risk:", ethers.formatEther(totalFunds), "ETH");
            
            // Attacker exploits
            await vaultDrainer.connect(attacker1).depositToVault({ value: ethers.parseEther("10") });
            await vaultDrainer.connect(attacker1).exploitEmergencyWithdraw();
            
            const totalDeposits = await vault.totalDeposits();
            const actualBalance = await vault.getBalance();
            const discrepancy = totalDeposits - actualBalance;
            
            console.log("    Recorded deposits:", ethers.formatEther(totalDeposits), "ETH");
            console.log("    Actual balance:", ethers.formatEther(actualBalance), "ETH");
            console.log("    Ghost deposits:", ethers.formatEther(discrepancy), "ETH");
            console.log("\n    ❌ Impact: Users can't withdraw their fair share");
            console.log("    - Attack cost: Gas fees only");
            console.log("    - Profit potential: Block legitimate withdrawals");
            console.log("    - Recovery: Requires contract upgrade");
            
            expect(discrepancy).to.be.greaterThan(0);
        });
        
        it("Should assess systemic risk from state corruption", async function () {
            console.log("\n    === Systemic Risk Assessment ===");
            
            console.log("    Corruption vectors identified:");
            console.log("      1. Token rescueCredit() bypasses totalSupply");
            console.log("      2. Vault emergencyWithdraw() ignores totalDeposits");
            console.log("      3. RewardPool addReward() doesn't update rewardPerToken");
            console.log("      4. System health checks use corrupted state");
            
            // Corrupt all components
            const systemToken = await system.token();
            const tokenContract = await ethers.getContractAt("InconsistentStateToken", systemToken);
            await tokenContract.rescueCredit(attacker1.address, ethers.parseEther("5000"));
            
            await system.updateSystemValue(ethers.parseEther("10000"));
            await system.checkSystemHealth();
            
            const healthy = await system.systemHealthy();
            
            console.log("\n    Failure propagation:");
            console.log("    - Single corruption point affects entire system");
            console.log("    - No recovery mechanism available");
            console.log("    - All dependent contracts compromised");
            
            console.log("\n    ❌ Systemic risk level: CRITICAL");
            console.log("    - State corruption is permanent");
            console.log("    - No way to revert to consistent state");
            console.log("    - System shutdown required");
            
            expect(healthy).to.be.false;
        });
    });
});
