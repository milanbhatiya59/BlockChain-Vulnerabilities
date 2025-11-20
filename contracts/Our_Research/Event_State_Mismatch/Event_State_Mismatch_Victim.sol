// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
 Event_State_Mismatch_Victim.sol
 Purpose: Demonstrates Event-State Mismatch Vulnerability.

 Vulnerability:
 - Events are emitted before checks OR emitted with incorrect values.
 - Off-chain systems that rely on events (TheGraph, monitoring bots)
   get a false picture of the contract state.
 - Events claim operations succeeded when they actually failed or had different values.
*/

contract EventStateMismatchVictim {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    event DepositLogged(address indexed user, uint256 amount);
    event WithdrawLogged(address indexed user, uint256 amount);
    event TransferLogged(address indexed from, address indexed to, uint256 amount);

    // ❌ VULNERABILITY 1: Emits event BEFORE the state is updated
    // If state update fails, event still exists making off-chain systems believe deposit succeeded
    function vulnerableDeposit() external payable {
        emit DepositLogged(msg.sender, msg.value);  // Event claims deposit happened
        
        // State update happens AFTER event emission
        // If this fails or reverts, the event is already emitted
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
    }

    // ❌ VULNERABILITY 2: Emits incorrect amount in event
    // Event lies about the amount withdrawn
    function vulnerableWithdraw(uint256 amount) external {
        // Event emitted with wrong amount BEFORE validation
        emit WithdrawLogged(msg.sender, amount * 2);  // Logs double the actual amount!
        
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Actual state change is different from what event claims
        balances[msg.sender] -= amount;
        totalWithdrawals += amount;
        payable(msg.sender).transfer(amount);
    }

    // ❌ VULNERABILITY 3: Emits event regardless of success
    // Event is emitted even if the operation fails
    function vulnerableTransfer(address to, uint256 amount) external {
        // Event emitted BEFORE any checks
        emit TransferLogged(msg.sender, to, amount);
        
        // These might fail, but event is already logged
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    // ✓ CORRECT: Event emitted AFTER all state changes and checks
    function correctDeposit() external payable {
        require(msg.value > 0, "Must deposit something");
        
        // Update state first
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        // Emit event AFTER successful state update
        emit DepositLogged(msg.sender, msg.value);
    }

    // ✓ CORRECT: Event emitted with correct values AFTER validation
    function correctWithdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Update state
        balances[msg.sender] -= amount;
        totalWithdrawals += amount;
        
        // Transfer ETH
        payable(msg.sender).transfer(amount);
        
        // Emit event AFTER everything succeeds with correct amount
        emit WithdrawLogged(msg.sender, amount);
    }

    // ✓ CORRECT: Event emitted AFTER all checks and state updates
    function correctTransfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Update state
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        // Emit event AFTER successful transfer
        emit TransferLogged(msg.sender, to, amount);
    }

    // Helper function to get balance
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}
