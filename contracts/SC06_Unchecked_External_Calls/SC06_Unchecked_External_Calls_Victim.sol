// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Vulnerable Contract: PaymentProcessor
// This contract processes payments to multiple recipients.
// However, it doesn't check the return value of external calls,
// which can lead to silent failures and loss of funds.

contract PaymentProcessor {
    address public owner;
    mapping(address => uint256) public balances;
    
    event DepositReceived(address indexed from, uint256 amount);
    event PaymentSent(address indexed to, uint256 amount, bool success);
    event BatchPaymentCompleted(uint256 successCount, uint256 failCount);

    constructor() {
        owner = msg.sender;
    }

    // Function to deposit funds
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
        emit DepositReceived(msg.sender, msg.value);
    }

    // Vulnerable function: Sends payment without checking return value
    // If the call fails, the function continues execution
    function sendPayment(address payable recipient, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(address(this).balance >= amount, "Insufficient balance");
        
        // VULNERABILITY: The return value of the call is not checked
        // If the recipient is a contract that rejects the payment, 
        // this will silently fail
        recipient.call{value: amount}("");
        
        emit PaymentSent(recipient, amount, true);
    }

    // Vulnerable function: Batch payments without checking return values
    function batchPayment(address payable[] calldata recipients, uint256[] calldata amounts) external {
        require(msg.sender == owner, "Only owner");
        require(recipients.length == amounts.length, "Array length mismatch");
        
        uint256 successCount = 0;
        uint256 failCount = 0;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            // VULNERABILITY: The return value is not checked
            // Failed payments are counted as successful
            recipients[i].call{value: amounts[i]}("");
            successCount++;
        }
        
        emit BatchPaymentCompleted(successCount, failCount);
    }

    // Vulnerable function: Forward call without checking success
    function forwardCall(address target, bytes calldata data) external payable {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABILITY: The success status and return data are ignored
        target.call{value: msg.value}(data);
    }

    // Vulnerable function: Withdraw with unchecked send
    function withdrawUnchecked(address payable recipient, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(balances[recipient] >= amount, "Insufficient balance");
        
        // VULNERABILITY: Using send() without checking return value
        // send() returns false on failure but doesn't revert
        balances[recipient] -= amount;
        recipient.send(amount);
    }

    // Function to get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Fallback to receive ETH
    receive() external payable {
        emit DepositReceived(msg.sender, msg.value);
    }
}
