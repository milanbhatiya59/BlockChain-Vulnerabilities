// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
 Semantic_State_Drift_Victim.sol
 Purpose: Vulnerable contract demonstrating Semantic State Drift.

 Vulnerability: Intended invariant: totalDeposits == sum(balances[user])
 - deposit(), withdraw(), and adminReward() maintain the invariant correctly.
 - A helper function `deductFee()` updates only user balances (not totalDeposits).
 - transferWithFee() uses the helper and causes drift, breaking the invariant.
*/

contract SemanticStateDriftVictim {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);
    event Rewarded(address indexed who, uint256 amount);
    event FeeDeducted(address indexed who, uint256 fee);
    event TransferWithFee(address indexed from, address indexed to, uint256 amount, uint256 fee);

    constructor() payable {
        // Initial mint for the deployer
        balances[msg.sender] = msg.value;
        totalDeposits = msg.value;
    }

    // Correct: deposit updates both balances and totalDeposits
    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // Correct: withdraw updates both balances and totalDeposits
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    // A legitimate admin reward which updates both
    function adminReward(address to, uint256 amount) external {
        // NOTE: no access control for demonstration purposes
        balances[to] += amount;
        totalDeposits += amount;
        emit Rewarded(to, amount);
    }

    // --- VULNERABILITY: Helper function that creates semantic drift ---
    // This helper deducts a fee from a user but ONLY updates balances,
    // forgetting to update totalDeposits.
    function deductFee(address from, uint256 fee) internal {
        if (fee == 0) return;
        if (balances[from] >= fee) {
            balances[from] -= fee;
            // BUG: totalDeposits is NOT adjusted -> semantic state drift
            emit FeeDeducted(from, fee);
        }
    }

    // --- VULNERABILITY: Function that uses the buggy helper ---
    // This function transfers amount and deducts a fee using the helper.
    // The fee is deducted from balances but NOT from totalDeposits.
    function transferWithFee(address to, uint256 amount, uint256 fee) external {
        require(balances[msg.sender] >= amount + fee, "insufficient funds");
        
        // Update balances for transfer
        balances[msg.sender] -= amount;
        balances[to] += amount;

        // Deduct fee via helper (only updates balances, not totalDeposits)
        deductFee(msg.sender, fee);

        // totalDeposits NOT updated for the fee -> drift is introduced
        emit TransferWithFee(msg.sender, to, amount, fee);
    }

    // View helper: compute sum of balances for given addresses
    function computeSum(address[] calldata addrs) external view returns (uint256) {
        uint256 s = 0;
        for (uint i = 0; i < addrs.length; i++) {
            s += balances[addrs[i]];
        }
        return s;
    }

    // Helper to check if invariant holds
    function checkInvariant(address[] calldata addrs) external view returns (bool) {
        uint256 sum = 0;
        for (uint i = 0; i < addrs.length; i++) {
            sum += balances[addrs[i]];
        }
        return sum == totalDeposits;
    }
}
