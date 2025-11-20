// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SemanticOpcodeBugDemo
 * @notice Demonstrates semantic-level bugs where assembly code writes to wrong storage slots
 * 
 * VULNERABILITY: Inline assembly uses incorrect storage slot calculations,
 * causing writes to corrupt unrelated state variables
 */
contract SemanticOpcodeBugDemo {
    // Storage layout:
    // slot 0: owner (address)
    // slot 1: config (uint256) - packed fields [0..127]=limit, [128..255]=flags
    // slot 2: balance (uint256)
    // slot 3: reserved (uint256)
    
    address public owner;
    uint256 public config; // bits: [0..127]=limit, [128..255]=flags
    uint256 public balance;
    uint256 public reserved;
    
    event LimitUpdated(uint256 newLimit);
    event ConfigCorrupted(uint256 slot, uint256 value);
    event BalanceCorrupted(uint256 oldBalance, uint256 newBalance);
    event StorageOverwritten(uint256 slot, uint256 oldValue, uint256 newValue);
    
    constructor() {
        owner = msg.sender;
        // Set config: flags=1 (upper 128 bits), limit=100 (lower 128 bits)
        config = (uint256(1) << 128) | uint256(100);
        balance = 1000 ether;
        reserved = 0;
    }
    
    // ❌ VULNERABILITY 1: Uses wrong storage slot (slot 2 instead of slot 1)
    // This overwrites balance instead of updating config
    function setLimitBad(uint256 newLimit) public {
        // Removed owner check to allow demonstration
        
        uint256 oldBalance = balance;
        
        // BUG: Uses slot 2 instead of slot 1
        // Should write to config (slot 1), but writes to balance (slot 2)
        assembly {
            sstore(2, newLimit) // WRONG SLOT!
        }
        
        emit LimitUpdated(newLimit);
        emit BalanceCorrupted(oldBalance, balance);
    }
    
    // ✅ CORRECT: Properly updates config at slot 1
    function setLimitGood(uint256 newLimit) public {
        require(msg.sender == owner, "only owner");
        require(newLimit <= type(uint128).max, "limit too large");
        
        // Preserve upper 128 bits (flags), update lower 128 bits (limit)
        uint256 flags = config >> 128;
        config = (flags << 128) | newLimit;
        
        emit LimitUpdated(newLimit);
    }
    
    // Safe getter interprets config from slot 1
    function getLimit() public view returns (uint256) {
        return uint256(config & ((uint256(1) << 128) - 1));
    }
    
    function getFlags() public view returns (uint256) {
        return uint256(config >> 128);
    }
}

/**
 * @title WrongSlotVault
 * @notice Vault with assembly bugs that corrupt storage slots
 */
contract WrongSlotVault {
    // Storage layout:
    // slot 0: owner
    // slot 1: totalDeposits
    // slot 2: withdrawalLimit
    // slot 3: emergencyMode (bool)
    
    address public owner;
    uint256 public totalDeposits;
    uint256 public withdrawalLimit;
    bool public emergencyMode;
    
    mapping(address => uint256) public deposits;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event StorageCorrupted(string variable, uint256 oldValue, uint256 newValue);
    event EmergencyModeActivated(bool activated);
    
    constructor() {
        owner = msg.sender;
        totalDeposits = 0;
        withdrawalLimit = 10 ether;
        emergencyMode = false;
    }
    
    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    // ❌ VULNERABILITY 2: Assembly tries to update withdrawalLimit (slot 2)
    // but uses keccak calculation that hits a mapping slot instead
    function setWithdrawalLimitBad(uint256 newLimit) external {
        // Removed owner check to allow demonstration
        
        uint256 oldLimit = withdrawalLimit;
        
        // BUG: Incorrect slot calculation
        assembly {
            // Developer intended: sstore(2, newLimit)
            // But incorrectly calculates mapping slot
            let slot := keccak256(0, 0) // Wrong calculation!
            sstore(slot, newLimit)
        }
        
        emit StorageCorrupted("withdrawalLimit", oldLimit, withdrawalLimit);
    }
    
    // ❌ VULNERABILITY 3: Off-by-one error in slot calculation
    function setEmergencyModeBad(bool mode) external {
        // Removed owner check to allow demonstration
        
        bool oldMode = emergencyMode;
        uint256 modeValue = mode ? 1 : 0;
        
        // BUG: Uses slot 2 instead of slot 3
        assembly {
            sstore(2, modeValue) // Overwrites withdrawalLimit!
        }
        
        emit StorageCorrupted("emergencyMode", oldMode ? 1 : 0, emergencyMode ? 1 : 0);
    }
    
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "insufficient deposit");
        require(amount <= withdrawalLimit || emergencyMode, "exceeds limit");
        
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title PackedStorageBug
 * @notice Demonstrates bugs in packed storage manipulation via assembly
 */
contract PackedStorageBug {
    // Storage slot 0: owner (160 bits) + paused (8 bits) + initialized (8 bits)
    // Storage slot 1: value1 (128 bits) + value2 (128 bits)
    
    address public owner;
    bool public paused;
    bool public initialized;
    
    uint128 public value1;
    uint128 public value2;
    
    event ValueUpdated(uint128 newValue1, uint128 newValue2);
    event StateCorrupted(string reason);
    event OwnerOverwritten(address oldOwner, address newOwner);
    
    constructor() {
        owner = msg.sender;
        paused = false;
        initialized = true;
        value1 = 100;
        value2 = 200;
    }
    
    // ❌ VULNERABILITY 4: Incorrect bit manipulation overwrites owner address
    function setValue1Bad(uint128 newValue) external {
        address oldOwner = owner;
        
        // BUG: Tries to update value1 (slot 1) but messes up bit shifting
        assembly {
            // Developer thinks slot 1 contains value1 in lower 128 bits
            // But actually value1 is in a different slot due to packing rules
            let slot0 := sload(0)
            
            // Intends to preserve upper bits, update lower 128 bits
            // But this actually modifies slot 0 (owner/paused/initialized)
            let newSlot := or(
                and(slot0, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000000000000000000000000000),
                newValue
            )
            sstore(0, newSlot) // CORRUPTS OWNER!
        }
        
        if (owner != oldOwner) {
            emit OwnerOverwritten(oldOwner, owner);
        }
        emit StateCorrupted("setValue1Bad corrupted owner address");
    }
    
    // ❌ VULNERABILITY 5: Incorrect masking causes partial overwrite
    function setValue2Bad(uint128 newValue) external {
        // BUG: Wrong slot and wrong bit position
        assembly {
            // Should modify upper 128 bits of slot with value1/value2
            // But uses wrong masking
            let slot1 := sload(1)
            let newSlot := or(
                and(slot1, 0x0000000000000000000000000000FFFF), // Wrong mask!
                shl(128, newValue)
            )
            sstore(1, newSlot)
        }
        
        emit StateCorrupted("setValue2Bad used wrong mask");
    }
    
    // ✅ CORRECT: Proper way to update packed storage
    function setValuesGood(uint128 newValue1, uint128 newValue2) external {
        value1 = newValue1;
        value2 = newValue2;
        emit ValueUpdated(newValue1, newValue2);
    }
}

/**
 * @title DynamicArrayBug
 * @notice Demonstrates storage slot collision with dynamic arrays
 */
contract DynamicArrayBug {
    address public owner;           // slot 0
    uint256 public criticalData;    // slot 1
    uint256[] public items;         // slot 2 (length), actual items at keccak256(2) + index
    
    event ItemAdded(uint256 value);
    event CriticalDataCorrupted(uint256 oldValue, uint256 newValue);
    event StorageCollision(uint256 slot, uint256 value);
    
    constructor() {
        owner = msg.sender;
        criticalData = 999999;
    }
    
    function addItem(uint256 value) external {
        items.push(value);
        emit ItemAdded(value);
    }
    
    // ❌ VULNERABILITY 6: Calculates array slot incorrectly, hits criticalData
    function setItemBad(uint256 index, uint256 value) external {
        require(index < items.length, "index out of bounds");
        
        uint256 oldCritical = criticalData;
        
        // BUG: Wrong array slot calculation
        // Developer tries to write to items[index] but calculates slot wrong
        // Uses slot 1 + index instead of keccak256(2) + index
        // When index = 0, this hits slot 1 (criticalData!)
        assembly {
            let slot := add(1, index) // WRONG! Should be add(keccak256(2, 32), index)
            sstore(slot, value)
        }
        
        if (criticalData != oldCritical) {
            emit CriticalDataCorrupted(oldCritical, criticalData);
        }
    }
    
    // ✅ CORRECT: Proper array access
    function setItemGood(uint256 index, uint256 value) external {
        require(index < items.length, "index out of bounds");
        items[index] = value;
    }
}

/**
 * @title SemanticBugSystem
 * @notice System demonstrating cascading failures from assembly bugs
 */
contract SemanticBugSystem {
    SemanticOpcodeBugDemo public opcodeContract;
    WrongSlotVault public vault;
    PackedStorageBug public packedContract;
    DynamicArrayBug public arrayContract;
    
    bool public systemHealthy;
    uint256 public corruptionCount;
    
    event SystemDeployed(address opcode, address vault, address packed, address array);
    event SystemCorrupted(string reason, uint256 corruptionCount);
    event HealthCheck(bool healthy);
    
    constructor() {
        opcodeContract = new SemanticOpcodeBugDemo();
        vault = new WrongSlotVault();
        packedContract = new PackedStorageBug();
        arrayContract = new DynamicArrayBug();
        
        systemHealthy = true;
        corruptionCount = 0;
        
        emit SystemDeployed(
            address(opcodeContract),
            address(vault),
            address(packedContract),
            address(arrayContract)
        );
    }
    
    function checkSystemHealth() external returns (bool) {
        // Check if any component has corrupted storage
        
        // Check opcode contract
        uint256 balance = opcodeContract.balance();
        uint256 limit = opcodeContract.getLimit();
        
        // If balance was corrupted by setLimitBad
        if (balance < 100 ether) {
            corruptionCount++;
            emit SystemCorrupted("OpcodeBug corrupted balance", corruptionCount);
            systemHealthy = false;
        }
        
        emit HealthCheck(systemHealthy);
        return systemHealthy;
    }
    
    function getCorruptionCount() external view returns (uint256) {
        return corruptionCount;
    }
}
