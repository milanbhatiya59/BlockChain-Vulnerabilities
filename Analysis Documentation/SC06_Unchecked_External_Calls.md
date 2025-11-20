# SC06: Unchecked External Calls

## Vulnerability Analysis

The `PaymentProcessor` contract is designed to send payments to various recipients. However, it contains a critical security flaw: **it doesn't check the return values of external calls**. This vulnerability can lead to silent failures where the contract believes a payment was successful, but it actually failed, resulting in lost or stuck funds.

### The Vulnerability

In Solidity, low-level call methods like `.call()`, `.send()`, and `.delegatecall()` return a boolean value indicating success or failure. If this return value is not checked, failures can go unnoticed, leading to inconsistent contract state and potential loss of funds.

#### Types of Unchecked External Calls

1. **Unchecked `.call()`**
2. **Unchecked `.send()`**
3. **Unchecked `.delegatecall()`**
4. **Unchecked `.staticcall()`**

### Vulnerable Code Examples

#### 1. Unchecked Low-Level Call

```solidity
function sendPayment(address payable recipient, uint256 amount) external {
    require(msg.sender == owner, "Only owner");
    require(address(this).balance >= amount, "Insufficient balance");
    
    // VULNERABILITY: The return value is not checked
    recipient.call{value: amount}("");
    
    emit PaymentSent(recipient, amount, true); // Always emits true!
}
```

**Problem**: If the recipient is a contract that rejects the payment (via `revert` in its `receive()` or `fallback()` function), the call will fail, but the function continues as if nothing happened. The event will incorrectly indicate success.

#### 2. Unchecked send()

```solidity
function withdrawUnchecked(address payable recipient, uint256 amount) external {
    require(msg.sender == owner, "Only owner");
    require(balances[recipient] >= amount, "Insufficient balance");
    
    // VULNERABILITY: send() returns false on failure but doesn't revert
    balances[recipient] -= amount;
    recipient.send(amount); // Return value ignored!
}
```

**Problem**: The balance is decreased before the `send()`, and if `send()` fails (returns `false`), the balance update is not reverted, leading to a mismatch between recorded balances and actual ETH.

#### 3. Batch Payments with Silent Failures

```solidity
function batchPayment(address payable[] calldata recipients, uint256[] calldata amounts) external {
    require(msg.sender == owner, "Only owner");
    
    uint256 successCount = 0;
    uint256 failCount = 0;
    
    for (uint256 i = 0; i < recipients.length; i++) {
        // VULNERABILITY: All payments counted as successful
        recipients[i].call{value: amounts[i]}("");
        successCount++; // Incremented even if call failed!
    }
    
    emit BatchPaymentCompleted(successCount, failCount); // failCount always 0!
}
```

**Problem**: The loop counts all payments as successful, even if some fail. This misrepresents the actual state and can lead to accounting errors.

## Exploitation Scenarios

### Attack 1: Rejecting Contract

An attacker deploys a contract that always reverts on receiving ETH:

```solidity
contract UncheckedCallExploiter {
    receive() external payable {
        revert("Payment rejected");
    }
}
```

When the vulnerable contract tries to send ETH to this attacker contract:
- The `.call()` fails and returns `false`
- But the vulnerable contract doesn't check this
- The contract thinks the payment succeeded
- The ETH is stuck in the vulnerable contract

### Attack 2: Inconsistent State

```solidity
// Vulnerable contract decreases balance first
balances[recipient] -= amount;
recipient.send(amount); // Fails but not checked

// Result: Balance decreased, but recipient didn't receive ETH
```

This creates an inconsistent state where:
- The contract's records show the balance was deducted
- But the recipient never received the funds
- The ETH is trapped in the contract

### Attack 3: Batch Payment Failures

In a batch payment scenario:
- Some recipients reject payments
- The contract reports all payments as successful
- The owner believes all recipients were paid
- But some recipients never received their funds
- The stuck ETH accumulates in the contract

## Impact

- **Silent Failures**: Critical operations fail without any indication
- **Stuck Funds**: ETH becomes trapped in contracts with no way to recover it
- **Accounting Errors**: Contract state doesn't match reality
- **False Reporting**: Events and logs misrepresent actual outcomes
- **Griefing Attacks**: Malicious recipients can cause DoS by rejecting payments
- **Loss of Trust**: Users lose confidence when payments mysteriously fail

## Mitigation

### 1. Always Check Return Values

#### Fixed `sendPayment` Function

```solidity
function sendPayment(address payable recipient, uint256 amount) external {
    require(msg.sender == owner, "Only owner");
    require(address(this).balance >= amount, "Insufficient balance");
    
    // CHECK the return value
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "Payment failed");
    
    emit PaymentSent(recipient, amount, success);
}
```

### 2. Fixed `withdrawUnchecked` Function

```solidity
function withdraw(address payable recipient, uint256 amount) external {
    require(msg.sender == owner, "Only owner");
    require(balances[recipient] >= amount, "Insufficient balance");
    
    balances[recipient] -= amount; // Update state first
    
    // CHECK the return value
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "Transfer failed");
    
    // Or revert the state change if it fails
    // if (!success) {
    //     balances[recipient] += amount;
    //     revert("Transfer failed");
    // }
}
```

### 3. Fixed Batch Payment Function

```solidity
function batchPayment(address payable[] calldata recipients, uint256[] calldata amounts) external {
    require(msg.sender == owner, "Only owner");
    require(recipients.length == amounts.length, "Array length mismatch");
    
    uint256 successCount = 0;
    uint256 failCount = 0;
    
    for (uint256 i = 0; i < recipients.length; i++) {
        (bool success, ) = recipients[i].call{value: amounts[i]}("");
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    emit BatchPaymentCompleted(successCount, failCount);
}
```

### 4. Use `.transfer()` for Simple ETH Transfers

```solidity
// .transfer() automatically reverts on failure
function sendPaymentSafe(address payable recipient, uint256 amount) external {
    require(msg.sender == owner, "Only owner");
    require(address(this).balance >= amount, "Insufficient balance");
    
    // .transfer() reverts on failure (but has 2300 gas limit)
    recipient.transfer(amount);
    
    emit PaymentSent(recipient, amount, true);
}
```

**Note**: `.transfer()` has a 2300 gas stipend limit, which may not be sufficient for contracts with complex `receive()` functions.

## Best Practices

1. **Always Check Return Values**: Never ignore the return value of `.call()`, `.send()`, `.delegatecall()`, or `.staticcall()`
2. **Use `require()` for Critical Operations**: Ensure the call succeeded with `require(success, "Error message")`
3. **Follow Checks-Effects-Interactions**: Update state before making external calls
4. **Use `.transfer()` When Appropriate**: For simple ETH transfers where gas limits aren't an issue
5. **Handle Failures Gracefully**: Consider what should happen when a call fails
6. **Implement Pull Payment Pattern**: Let recipients withdraw funds themselves rather than pushing payments
7. **Add Reentrancy Guards**: Protect against reentrancy when making external calls
8. **Comprehensive Testing**: Test with both accepting and rejecting recipients
9. **Use Static Analysis Tools**: Tools like Slither and Mythril can detect unchecked calls
10. **Code Reviews**: Have security experts review external call patterns

## Additional Considerations

### Pull Payment Pattern

Instead of pushing payments, implement a withdrawal pattern:

```solidity
mapping(address => uint256) public pendingWithdrawals;

function addPayment(address recipient, uint256 amount) external {
    require(msg.sender == owner, "Only owner");
    pendingWithdrawals[recipient] += amount;
}

function withdraw() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0, "No funds to withdraw");
    
    pendingWithdrawals[msg.sender] = 0; // Update state first
    
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

This pattern:
- Shifts responsibility to recipients
- Prevents DoS attacks from rejecting recipients
- Provides better control over gas costs
- Is more resistant to reentrancy attacks
