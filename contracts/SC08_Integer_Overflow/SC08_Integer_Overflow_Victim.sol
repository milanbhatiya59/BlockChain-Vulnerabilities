// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;  // Using older version to demonstrate overflow/underflow

/*
 SC08_Integer_Overflow_Victim.sol
 Purpose: Demonstrates Integer Overflow and Underflow vulnerabilities.
 
 Note: Solidity 0.8.0+ has built-in overflow/underflow checks.
 This contract uses 0.7.6 to demonstrate the vulnerability.
 
 Vulnerabilities:
 - Integer overflow: Addition exceeds maximum value and wraps around
 - Integer underflow: Subtraction goes below zero and wraps around
 - Multiplication overflow: Product exceeds maximum value
*/

contract IntegerOverflowVictim {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    uint8 public smallValue;  // max value: 255
    uint256 public largeValue;  // max value: 2^256 - 1
    
    event Overflow(string message, uint256 value);
    event Underflow(string message, uint256 value);
    
    constructor() {
        totalSupply = 1000000 * 10**18;
        balances[msg.sender] = totalSupply;
    }
    
    // ❌ VULNERABILITY 1: Addition Overflow
    // If balance + amount > max uint256, it wraps around to a small number
    function vulnerableDeposit(uint256 amount) external {
        // No overflow check - if balances[msg.sender] + amount > max uint256, wraps around
        balances[msg.sender] += amount;
        totalSupply += amount;
        
        emit Overflow("Deposit might overflow", balances[msg.sender]);
    }
    
    // ❌ VULNERABILITY 2: Subtraction Underflow
    // If amount > balance, result wraps around to a huge number
    function vulnerableWithdraw(uint256 amount) external {
        // No underflow check - if amount > balances[msg.sender], wraps to huge number
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Underflow("Withdraw might underflow", balances[msg.sender]);
    }
    
    // ❌ VULNERABILITY 3: Multiplication Overflow
    function vulnerableMultiply(uint256 a, uint256 b) external pure returns (uint256) {
        // No overflow check - if a * b > max uint256, wraps around
        uint256 result = a * b;
        return result;
    }
    
    // ❌ VULNERABILITY 4: Batch Transfer with Overflow
    function vulnerableBatchTransfer(address[] calldata recipients, uint256 amount) external {
        // Calculate total needed
        uint256 totalNeeded = recipients.length * amount;  // Can overflow!
        
        require(balances[msg.sender] >= totalNeeded, "Insufficient balance");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            balances[msg.sender] -= amount;
            balances[recipients[i]] += amount;
        }
    }
    
    // ❌ VULNERABILITY 5: Small Type Overflow (uint8)
    function vulnerableIncrementSmall() external {
        // smallValue is uint8 (max 255)
        // If smallValue = 255, this will wrap to 0
        smallValue++;
        
        emit Overflow("Small value incremented", smallValue);
    }
    
    // ❌ VULNERABILITY 6: Token Sale with Overflow
    function vulnerableBuyTokens(uint256 tokenAmount) external payable {
        uint256 price = 1 ether;  // 1 ETH per token
        
        // This multiplication can overflow!
        uint256 cost = tokenAmount * price;
        
        require(msg.value >= cost, "Insufficient payment");
        
        balances[msg.sender] += tokenAmount;
    }
    
    // ✓ SAFE: Using SafeMath-like checks (manual)
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
    
    function safeSub(uint256 a, uint256 b) public pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction underflow");
        uint256 c = a - b;
        return c;
    }
    
    function safeMul(uint256 a, uint256 b) public pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }
    
    // ✓ SAFE: Deposit with overflow protection
    function safeDeposit(uint256 amount) external {
        balances[msg.sender] = safeAdd(balances[msg.sender], amount);
        totalSupply = safeAdd(totalSupply, amount);
    }
    
    // ✓ SAFE: Withdraw with underflow protection
    function safeWithdraw(uint256 amount) external {
        balances[msg.sender] = safeSub(balances[msg.sender], amount);
        totalSupply = safeSub(totalSupply, amount);
    }
    
    // Helper functions
    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }
    
    function getMaxUint256() external pure returns (uint256) {
        return type(uint256).max;
    }
    
    function getMaxUint8() external pure returns (uint8) {
        return type(uint8).max;
    }
}

// Victim contract demonstrating time manipulation with overflow
contract TimeLockVictim {
    mapping(address => uint256) public lockTime;
    mapping(address => uint256) public balances;
    
    event Locked(address indexed user, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount);
    
    // ❌ VULNERABILITY: Overflow in time calculation
    function deposit(uint256 lockDuration) external payable {
        require(msg.value > 0, "Must deposit something");
        
        balances[msg.sender] += msg.value;
        
        // VULNERABLE: lockTime can overflow if lockDuration is huge
        // block.timestamp + huge_number can wrap around to small number
        lockTime[msg.sender] = block.timestamp + lockDuration;
        
        emit Locked(msg.sender, lockTime[msg.sender]);
    }
    
    function withdraw() external {
        require(balances[msg.sender] > 0, "No balance");
        require(block.timestamp >= lockTime[msg.sender], "Still locked");
        
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        
        payable(msg.sender).transfer(amount);
        
        emit Withdrawn(msg.sender, amount);
    }
}
