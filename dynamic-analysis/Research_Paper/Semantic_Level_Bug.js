const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Research Paper: Semantic Level Bug - Dynamic Analysis", function () {
    let opcodeContract;
    let vault;
    let packedContract;
    let arrayContract;
    let system;
    let opcodeExploiter;
    let vaultAttacker;
    let packedExploiter;
    let arrayExploiter;
    let systemCorruptor;
    let owner;
    let user1;
    let attacker1;
    
    beforeEach(async function () {
        [owner, user1, attacker1] = await ethers.getSigners();
        
        // Deploy victim contracts
        const SemanticOpcodeBugDemo = await ethers.getContractFactory("SemanticOpcodeBugDemo");
        opcodeContract = await SemanticOpcodeBugDemo.deploy();
        await opcodeContract.waitForDeployment();
        
        const WrongSlotVault = await ethers.getContractFactory("WrongSlotVault");
        vault = await WrongSlotVault.deploy();
        await vault.waitForDeployment();
        
        const PackedStorageBug = await ethers.getContractFactory("PackedStorageBug");
        packedContract = await PackedStorageBug.deploy();
        await packedContract.waitForDeployment();
        
        const DynamicArrayBug = await ethers.getContractFactory("DynamicArrayBug");
        arrayContract = await DynamicArrayBug.deploy();
        await arrayContract.waitForDeployment();
        
        const SemanticBugSystem = await ethers.getContractFactory("SemanticBugSystem");
        system = await SemanticBugSystem.deploy();
        await system.waitForDeployment();
        
        // Deploy attacker contracts
        const OpcodeExploiter = await ethers.getContractFactory("OpcodeExploiter");
        opcodeExploiter = await OpcodeExploiter.connect(attacker1).deploy(await opcodeContract.getAddress());
        await opcodeExploiter.waitForDeployment();
        
        const VaultStorageAttacker = await ethers.getContractFactory("VaultStorageAttacker");
        vaultAttacker = await VaultStorageAttacker.connect(attacker1).deploy(await vault.getAddress());
        await vaultAttacker.waitForDeployment();
        
        const PackedStorageExploiter = await ethers.getContractFactory("PackedStorageExploiter");
        packedExploiter = await PackedStorageExploiter.connect(attacker1).deploy(await packedContract.getAddress());
        await packedExploiter.waitForDeployment();
        
        const ArraySlotExploiter = await ethers.getContractFactory("ArraySlotExploiter");
        arrayExploiter = await ArraySlotExploiter.connect(attacker1).deploy(await arrayContract.getAddress());
        await arrayExploiter.waitForDeployment();
        
        const SystemWideCorruptor = await ethers.getContractFactory("SystemWideCorruptor");
        systemCorruptor = await SystemWideCorruptor.connect(attacker1).deploy(await system.getAddress());
        await systemCorruptor.waitForDeployment();
    });
    
    describe("Vulnerability Detection", function () {
        it("Should detect wrong storage slot write in opcode bug", async function () {
            const balanceBefore = await opcodeContract.balance();
            const limitBefore = await opcodeContract.getLimit();
            const configBefore = await opcodeContract.config();
            
            console.log("    Before setLimitBad:");
            console.log("    - Balance:", ethers.formatEther(balanceBefore), "ETH");
            console.log("    - Limit:", limitBefore.toString());
            console.log("    - Config:", configBefore.toString());
            
            // Call setLimitBad which writes to wrong slot
            const maliciousValue = 12345;
            await opcodeContract.setLimitBad(maliciousValue);
            
            const balanceAfter = await opcodeContract.balance();
            const limitAfter = await opcodeContract.getLimit();
            const configAfter = await opcodeContract.config();
            
            console.log("    After setLimitBad(12345):");
            console.log("    - Balance:", ethers.formatEther(balanceAfter), "ETH (CORRUPTED!)");
            console.log("    - Limit:", limitAfter.toString(), "(unchanged - reads from correct slot)");
            console.log("    - Config:", configAfter.toString(), "(unchanged)");
            console.log("    ❌ Balance overwritten by wrong slot write (slot 2 instead of slot 1)");
            
            expect(balanceAfter).to.equal(maliciousValue); // Balance corrupted!
            expect(limitAfter).to.equal(limitBefore); // Limit unchanged
            expect(configAfter).to.equal(configBefore); // Config unchanged
        });
        
        it("Should detect vault withdrawal limit corruption", async function () {
            const limitBefore = await vault.withdrawalLimit();
            
            console.log("    Initial withdrawal limit:", ethers.formatEther(limitBefore), "ETH");
            
            // Trigger the bug
            await vault.setWithdrawalLimitBad(ethers.parseEther("999999"));
            
            const limitAfter = await vault.withdrawalLimit();
            
            console.log("    After setWithdrawalLimitBad:");
            console.log("    - Expected new limit: 999999 ETH");
            console.log("    - Actual limit:", ethers.formatEther(limitAfter), "ETH");
            console.log("    ❌ Limit unchanged due to wrong storage slot calculation");
            
            // Limit remains unchanged because write went to wrong slot
            expect(limitAfter).to.equal(limitBefore);
        });
        
        it("Should detect emergency mode corrupting withdrawal limit", async function () {
            const limitBefore = await vault.withdrawalLimit();
            const emergencyBefore = await vault.emergencyMode();
            
            console.log("    Before setEmergencyModeBad:");
            console.log("    - Withdrawal Limit:", ethers.formatEther(limitBefore), "ETH");
            console.log("    - Emergency Mode:", emergencyBefore);
            
            // This will write to slot 2 (withdrawalLimit) instead of slot 3 (emergencyMode)
            await vault.setEmergencyModeBad(true);
            
            const limitAfter = await vault.withdrawalLimit();
            const emergencyAfter = await vault.emergencyMode();
            
            console.log("    After setEmergencyModeBad(true):");
            console.log("    - Withdrawal Limit:", ethers.formatEther(limitAfter), "ETH (CORRUPTED!)");
            console.log("    - Emergency Mode:", emergencyAfter, "(unchanged)");
            console.log("    ❌ Off-by-one error: wrote to slot 2 instead of slot 3");
            
            expect(limitAfter).to.equal(1); // Corrupted to 1 (true as uint256)
            expect(emergencyAfter).to.equal(emergencyBefore); // Unchanged
        });
        
        it("Should detect packed storage owner corruption", async function () {
            const ownerBefore = await packedContract.owner();
            const value1Before = await packedContract.value1();
            
            console.log("    Before setValue1Bad:");
            console.log("    - Owner:", ownerBefore);
            console.log("    - Value1:", value1Before.toString());
            
            // This will corrupt the owner address
            const maliciousValue = 0xDEADBEEF;
            await packedContract.setValue1Bad(maliciousValue);
            
            const ownerAfter = await packedContract.owner();
            const value1After = await packedContract.value1();
            
            console.log("    After setValue1Bad(0xDEADBEEF):");
            console.log("    - Owner:", ownerAfter, "(CORRUPTED!)");
            console.log("    - Value1:", value1After.toString());
            console.log("    ❌ Bit manipulation error overwrote owner address in slot 0");
            
            expect(ownerAfter).to.not.equal(ownerBefore);
        });
        
        it("Should detect array slot collision corrupting critical data", async function () {
            // Setup array
            await arrayContract.addItem(100);
            await arrayContract.addItem(200);
            
            const criticalBefore = await arrayContract.criticalData();
            console.log("    Initial critical data:", criticalBefore.toString());
            expect(criticalBefore).to.equal(999999);
            
            // Exploit setItemBad to corrupt criticalData
            const maliciousValue = 12345;
            await arrayContract.setItemBad(0, maliciousValue);
            
            const criticalAfter = await arrayContract.criticalData();
            
            console.log("    After setItemBad(0, 12345):");
            console.log("    - Critical Data:", criticalAfter.toString(), "(CORRUPTED!)");
            console.log("    ❌ Array slot calculation: 2 + 0 = 2 (criticalData slot)");
            console.log("    ❌ Should be: keccak256(2) + 0");
            
            expect(criticalAfter).to.equal(maliciousValue);
        });
    });
    
    describe("Attack Scenarios", function () {
        it("Should execute opcode exploitation attack", async function () {
            console.log("    [ATTACK] Opcode Storage Corruption");
            
            const balanceBefore = await opcodeContract.balance();
            console.log("    Step 1: Initial balance:", ethers.formatEther(balanceBefore), "ETH");
            
            // Exploit
            await opcodeExploiter.connect(attacker1).exploitWrongSlot(99);
            
            const balanceAfter = await opcodeContract.balance();
            const limitAfter = await opcodeContract.getLimit();
            
            console.log("    Step 2: Triggered setLimitBad(99)");
            console.log("    Step 3: Balance corrupted to:", balanceAfter.toString());
            console.log("    Step 4: Limit still shows:", limitAfter.toString(), "(reads from correct slot)");
            console.log("    ✓ Attack successful: Balance overwritten, limit unchanged");
            
            expect(balanceAfter).to.equal(99);
            expect(limitAfter).to.equal(100); // Original limit unchanged
        });
        
        it("Should execute vault storage corruption attack", async function () {
            console.log("    [ATTACK] Vault Storage Slot Corruption");
            
            // Deposit
            console.log("    Step 1: Deposit 5 ETH to vault");
            await vaultAttacker.connect(attacker1).depositToVault({ value: ethers.parseEther("5") });
            
            const limitBefore = await vault.withdrawalLimit();
            console.log("    Step 2: Initial withdrawal limit:", ethers.formatEther(limitBefore), "ETH");
            
            // Corrupt emergency mode (which overwrites limit)
            console.log("    Step 3: Trigger setEmergencyModeBad(true)");
            await vaultAttacker.connect(attacker1).corruptEmergencyMode(true);
            
            const limitAfter = await vault.withdrawalLimit();
            const emergencyAfter = await vault.emergencyMode();
            
            console.log("    Step 4: Withdrawal limit corrupted to:", ethers.formatEther(limitAfter), "ETH");
            console.log("    Step 5: Emergency mode:", emergencyAfter, "(unchanged)");
            console.log("    ✓ Attack successful: Withdrawal limit overwritten to 1 wei");
            
            expect(limitAfter).to.equal(1);
            expect(emergencyAfter).to.be.false;
        });
        
        it("Should execute packed storage owner takeover attempt", async function () {
            console.log("    [ATTACK] Packed Storage Owner Corruption");
            
            const ownerBefore = await packedContract.owner();
            console.log("    Step 1: Original owner:", ownerBefore);
            
            // Exploit
            console.log("    Step 2: Trigger setValue1Bad(0xBADC0DE)");
            await packedExploiter.connect(attacker1).corruptOwnerAddress(0xBADC0DE);
            
            const ownerAfter = await packedContract.owner();
            console.log("    Step 3: Owner after corruption:", ownerAfter);
            console.log("    ✓ Attack successful: Owner address corrupted by bit manipulation");
            
            expect(ownerAfter).to.not.equal(ownerBefore);
        });
        
        it("Should execute array slot collision attack", async function () {
            console.log("    [ATTACK] Array Slot Collision");
            
            // Setup
            console.log("    Step 1: Add 3 items to array");
            await arrayExploiter.connect(attacker1).setupArray(3);
            
            const criticalBefore = await arrayContract.criticalData();
            console.log("    Step 2: Critical data before:", criticalBefore.toString());
            
            // Exploit
            console.log("    Step 3: Trigger setItemBad(0, 777)");
            await arrayExploiter.connect(attacker1).corruptCriticalData(777);
            
            const criticalAfter = await arrayContract.criticalData();
            console.log("    Step 4: Critical data after:", criticalAfter.toString());
            console.log("    ✓ Attack successful: Critical data overwritten via array slot collision");
            
            expect(criticalAfter).to.equal(777);
        });
    });
    
    describe("Storage Layout Analysis", function () {
        it("Should analyze storage slot corruption patterns", async function () {
            console.log("\n    === Storage Slot Analysis ===");
            console.log("    SemanticOpcodeBugDemo layout:");
            console.log("    - slot 0: owner (address)");
            console.log("    - slot 1: config (uint256)");
            console.log("    - slot 2: balance (uint256)  <-- TARGET OF BUG");
            console.log("    - slot 3: reserved (uint256)");
            
            console.log("\n    setLimitBad() behavior:");
            console.log("    - Intended: write to slot 1 (config)");
            console.log("    - Actual: writes to slot 2 (balance)");
            console.log("    - Result: balance corrupted, config unchanged");
            
            // Demonstrate
            await opcodeContract.setLimitBad(555);
            
            const balance = await opcodeContract.balance();
            const limit = await opcodeContract.getLimit();
            const config = await opcodeContract.config();
            
            console.log("\n    After setLimitBad(555):");
            console.log("    - balance =", balance.toString(), "(corrupted)");
            console.log("    - limit =", limit.toString(), "(unchanged, reads from config)");
            console.log("    - config =", config.toString(), "(unchanged)");
            
            expect(balance).to.equal(555);
            expect(limit).to.equal(100);
        });
        
        it("Should analyze packed storage corruption", async function () {
            console.log("\n    === Packed Storage Analysis ===");
            console.log("    PackedStorageBug slot 0 layout:");
            console.log("    - bits [0..159]: owner (address)");
            console.log("    - bits [160..167]: paused (bool)");
            console.log("    - bits [168..175]: initialized (bool)");
            
            console.log("\n    setValue1Bad() mistake:");
            console.log("    - Thinks: value1 is in slot 1 lower 128 bits");
            console.log("    - Actually: modifies slot 0 due to packing");
            console.log("    - Result: owner address corrupted");
            
            const ownerBefore = await packedContract.owner();
            await packedContract.setValue1Bad(0xABCD);
            const ownerAfter = await packedContract.owner();
            
            console.log("\n    Corruption result:");
            console.log("    - Owner before:", ownerBefore);
            console.log("    - Owner after:", ownerAfter);
            console.log("    ❌ Lower bits of owner overwritten with 0xABCD");
            
            expect(ownerAfter).to.not.equal(ownerBefore);
        });
    });
    
    describe("System-Wide Impact", function () {
        it("Should demonstrate cascading corruption across system", async function () {
            console.log("\n    === System-Wide Corruption Analysis ===");
            
            const systemOpcodeContract = await system.opcodeContract();
            const opcodeInstance = await ethers.getContractAt("SemanticOpcodeBugDemo", systemOpcodeContract);
            
            const balanceBefore = await opcodeInstance.balance();
            console.log("    Initial system state:");
            console.log("    - Opcode contract balance:", ethers.formatEther(balanceBefore), "ETH");
            console.log("    - System healthy:", await system.systemHealthy());
            
            // Corrupt the system
            await systemCorruptor.connect(attacker1).corruptEntireSystem();
            
            const balanceAfter = await opcodeInstance.balance();
            const systemHealthy = await system.systemHealthy();
            const corruptionCount = await system.corruptionCount();
            
            console.log("\n    After system corruption:");
            console.log("    - Opcode contract balance:", balanceAfter.toString());
            console.log("    - System healthy:", systemHealthy);
            console.log("    - Corruption count:", corruptionCount.toString());
            console.log("    ❌ System-wide failure from single assembly bug");
            
            expect(systemHealthy).to.be.false;
            expect(corruptionCount).to.be.greaterThan(0);
        });
        
        it("Should quantify storage corruption impact", async function () {
            console.log("\n    === Storage Corruption Impact ===");
            
            // Corrupt multiple contracts
            await opcodeContract.setLimitBad(1);
            await vault.setEmergencyModeBad(true);
            await arrayContract.addItem(100);
            await arrayContract.setItemBad(0, 999);
            
            const opcodeBalance = await opcodeContract.balance();
            const vaultLimit = await vault.withdrawalLimit();
            const criticalData = await arrayContract.criticalData();
            
            console.log("    Corrupted state across contracts:");
            console.log("    1. OpcodeContract.balance:", opcodeBalance.toString(), "(should be 1000 ether)");
            console.log("    2. Vault.withdrawalLimit:", vaultLimit.toString(), "(should be 10 ether)");
            console.log("    3. Array.criticalData:", criticalData.toString(), "(should be 999999)");
            
            console.log("\n    ❌ Impact Assessment:");
            console.log("    - 3/3 contracts have corrupted storage");
            console.log("    - All from assembly slot calculation errors");
            console.log("    - No runtime errors, silent corruption");
            console.log("    - Recovery: impossible without contract upgrade");
            
            expect(opcodeBalance).to.not.equal(ethers.parseEther("1000"));
            expect(vaultLimit).to.not.equal(ethers.parseEther("10"));
            expect(criticalData).to.not.equal(999999);
        });
    });
    
    describe("Detection and Prevention", function () {
        it("Should compare correct vs incorrect slot access", async function () {
            console.log("\n    === Correct vs Incorrect Slot Access ===");
            
            // Incorrect way
            const limitBefore = await opcodeContract.getLimit();
            await opcodeContract.setLimitBad(200);
            const limitAfter = await opcodeContract.getLimit();
            
            console.log("    ❌ setLimitBad(200):");
            console.log("    - Limit before:", limitBefore.toString());
            console.log("    - Limit after:", limitAfter.toString(), "(unchanged!)");
            console.log("    - Balance:", (await opcodeContract.balance()).toString(), "(corrupted to 200)");
            
            // Correct way
            await opcodeContract.setLimitGood(300);
            const limitGood = await opcodeContract.getLimit();
            
            console.log("\n    ✓ setLimitGood(300):");
            console.log("    - Limit after:", limitGood.toString(), "(correctly updated)");
            console.log("    - Config:", (await opcodeContract.config()).toString());
            
            console.log("\n    Key difference:");
            console.log("    - Bad: assembly sstore(2, value) - wrong slot");
            console.log("    - Good: config = (flags << 128) | value - Solidity handles slots");
            
            expect(limitAfter).to.equal(100); // Bad function didn't update
            expect(limitGood).to.equal(300); // Good function updated correctly
        });
    });
});
