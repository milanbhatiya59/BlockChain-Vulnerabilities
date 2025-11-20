# Event-State Mismatch

## Vulnerability Analysis

Event-State Mismatch occurs when smart contract events are emitted with incorrect information or at the wrong time relative to state changes. This creates a discrepancy between what off-chain systems observe (via events) and the actual on-chain state, leading to incorrect data in indexers, monitoring systems, and user interfaces.

### What is Event-State Mismatch?

Events in Solidity are designed to log important state changes for off-chain consumption. However, when events are:
- **Emitted before validation** checks
- **Emitted with incorrect values**
- **Emitted regardless of operation success**
- **Emitted before state updates**

Off-chain systems that rely on these events (TheGraph, Etherscan, monitoring bots, dApps) receive false information, creating a dangerous mismatch between perceived and actual contract state.

### Why This Matters

Off-chain systems cannot directly read all contract state efficiently. Instead, they:
1. **Listen to events** for state changes
2. **Build local databases** based on event data
3. **Serve queries** from indexed event data

If events lie, these systems serve false information to users and applications.

## Common Patterns Leading to Mismatch

### 1. **Event Before Validation**

```solidity
// ❌ VULNERABLE: Event emitted before checks
function withdraw(uint256 amount) external {
    emit WithdrawLogged(msg.sender, amount);  // Event emitted first
    
    require(balances[msg.sender] >= amount, "Insufficient balance");  // Might fail
    
    balances[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);
}
```

**Problem**: If the `require` fails, the transaction reverts, but the event was already emitted in the transaction logs before the revert.

### 2. **Event Before State Update**

```solidity
// ❌ VULNERABLE: Event emitted before state changes
function deposit() external payable {
    emit DepositLogged(msg.sender, msg.value);  // Event claims deposit happened
    
    // State update comes after
    balances[msg.sender] += msg.value;  // If this fails, event is misleading
}
```

**Problem**: Event suggests the deposit completed, but state update could fail or be skipped.

### 3. **Event With Incorrect Values**

```solidity
// ❌ VULNERABLE: Event logs wrong amount
function transfer(address to, uint256 amount) external {
    uint256 fee = amount / 10;  // 10% fee
    uint256 actualTransfer = amount - fee;
    
    emit TransferLogged(msg.sender, to, amount);  // Logs full amount
    
    balances[msg.sender] -= amount;
    balances[to] += actualTransfer;  // Actually transfers less
    balances[owner] += fee;
}
```

**Problem**: Event claims `amount` was transferred, but `actualTransfer` (less than `amount`) was received by recipient.

### 4. **Missing Event Updates**

```solidity
// ❌ VULNERABLE: Internal function doesn't emit event
function _internalTransfer(address from, address to, uint256 amount) internal {
    balances[from] -= amount;
    balances[to] += amount;
    // No event emitted!
}

function complexOperation() external {
    _internalTransfer(msg.sender, address(this), 100);  // Hidden transfer
    // Off-chain systems have no idea this happened
}
```

## Vulnerable Code Examples

### Example 1: Event Before State Update

```solidity
contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    event DepositLogged(address indexed user, uint256 amount);
    
    // ❌ VULNERABLE
    function deposit() external payable {
        emit DepositLogged(msg.sender, msg.value);  // Event first
        
        // If this update is inside a complex function that might fail:
        balances[msg.sender] += msg.value;
        
        // Event already logged, but state update could have failed
    }
}
```

### Example 2: Event With Wrong Values

```solidity
contract VulnerableToken {
    mapping(address => uint256) public balances;
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    // ❌ VULNERABLE
    function transferWithFee(address to, uint256 amount) external {
        uint256 fee = amount / 20;  // 5% fee
        uint256 netAmount = amount - fee;
        
        // Event logs full amount (misleading)
        emit Transfer(msg.sender, to, amount);
        
        balances[msg.sender] -= amount;
        balances[to] += netAmount;  // Recipient gets less
        balances[owner] += fee;
        
        // Off-chain systems think 'amount' was transferred
        // But 'to' only received 'netAmount'
    }
}
```

### Example 3: Event Before Validation

```solidity
contract VulnerableMarketplace {
    event OrderPlaced(address indexed buyer, uint256 orderId, uint256 amount);
    
    // ❌ VULNERABLE
    function placeOrder(uint256 itemId, uint256 amount) external payable {
        emit OrderPlaced(msg.sender, nextOrderId, amount);  // Event first
        
        require(items[itemId].available, "Item not available");
        require(msg.value >= items[itemId].price, "Insufficient payment");
        
        // If requires fail, transaction reverts
        // But event was already in the logs before revert
        
        orders[nextOrderId] = Order({...});
        nextOrderId++;
    }
}
```

## Real-World Impact

### Affected Systems

1. **Block Explorers** (Etherscan, etc.)
   - Display incorrect transaction history
   - Show transfers that never completed
   - Mislead users about contract activity

2. **TheGraph & Indexers**
   - Build incorrect databases
   - Serve false data to dApps
   - Create phantom balances/transfers

3. **Monitoring Bots**
   - Trigger false alerts
   - Miss actual problems
   - Generate incorrect analytics

4. **DApp UIs**
   - Display wrong balances
   - Show failed transactions as successful
   - Confuse users with phantom operations

5. **Accounting Systems**
   - Track incorrect volumes
   - Calculate wrong totals
   - Produce inaccurate reports

### Real-World Scenarios

**Scenario 1: Phantom Deposits**
```
Event: DepositLogged(Alice, 100 ETH)
Reality: Deposit failed, Alice has 0 ETH
UI Shows: Alice has 100 ETH
Result: Alice tries to withdraw, transaction fails, confusion ensues
```

**Scenario 2: Inflated Volume**
```
Events: 1000 Transfer events
Reality: 700 transfers succeeded, 300 failed
DEX Shows: 1000 transfers = high volume
Result: False impression of liquidity and activity
```

**Scenario 3: Hidden Fees**
```
Event: Transfer(Alice, Bob, 100 tokens)
Reality: Bob received 95 tokens (5 token fee)
Explorer Shows: Bob received 100 tokens
Result: Bob expects 100, has 95, disputes arise
```

## Mitigation Strategies

### 1. **Emit Events AFTER All State Changes**

```solidity
// ✅ CORRECT: Event after state updates
function deposit() external payable {
    require(msg.value > 0, "Must deposit something");
    
    // Update state first
    balances[msg.sender] += msg.value;
    totalDeposits += msg.value;
    
    // Emit event LAST, after all state changes succeed
    emit DepositLogged(msg.sender, msg.value);
}
```

### 2. **Emit Events After All Validations**

```solidity
// ✅ CORRECT: Event after all checks
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    require(amount > 0, "Invalid amount");
    
    // Update state
    balances[msg.sender] -= amount;
    
    // Perform transfer
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
    
    // Emit event ONLY after everything succeeds
    emit WithdrawLogged(msg.sender, amount);
}
```

### 3. **Emit Accurate Values**

```solidity
// ✅ CORRECT: Emit actual transferred amount
function transferWithFee(address to, uint256 amount) external {
    require(to != address(0), "Invalid recipient");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    uint256 fee = amount / 20;  // 5% fee
    uint256 netAmount = amount - fee;
    
    // Update state
    balances[msg.sender] -= amount;
    balances[to] += netAmount;
    balances[feeCollector] += fee;
    
    // Emit TWO events with accurate information
    emit Transfer(msg.sender, to, netAmount);  // Actual amount received
    emit FeeCharged(msg.sender, fee);  // Separate event for fee
}
```

### 4. **Use Comprehensive Events**

```solidity
// ✅ CORRECT: Include all relevant information
event TransferWithDetails(
    address indexed from,
    address indexed to,
    uint256 grossAmount,
    uint256 fee,
    uint256 netAmount,
    bool success
);

function transferWithFee(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    uint256 fee = amount / 20;
    uint256 netAmount = amount - fee;
    
    balances[msg.sender] -= amount;
    balances[to] += netAmount;
    balances[feeCollector] += fee;
    
    // Comprehensive event with all details
    emit TransferWithDetails(
        msg.sender,
        to,
        amount,      // Gross amount
        fee,         // Fee amount
        netAmount,   // Net amount received
        true         // Success flag
    );
}
```

### 5. **Event Emission Pattern**

```solidity
// ✅ CORRECT: Checks-Effects-Interactions-Events pattern
function complexOperation(uint256 amount) external {
    // 1. CHECKS: Validate all inputs and preconditions
    require(amount > 0, "Invalid amount");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    require(!paused, "Contract paused");
    
    // 2. EFFECTS: Update all state variables
    balances[msg.sender] -= amount;
    totalProcessed += amount;
    lastUpdate = block.timestamp;
    
    // 3. INTERACTIONS: External calls
    (bool success, ) = externalContract.call(data);
    require(success, "External call failed");
    
    // 4. EVENTS: Emit events LAST
    emit OperationCompleted(msg.sender, amount, block.timestamp);
}
```

### 6. **Avoid Events in Internal Functions (or ensure they're called correctly)**

```solidity
// ✅ CORRECT: Event in public function, not internal
function _internalTransfer(address from, address to, uint256 amount) internal {
    balances[from] -= amount;
    balances[to] += amount;
    // Don't emit here - let caller emit with full context
}

function transfer(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    _internalTransfer(msg.sender, to, amount);
    
    // Emit event in public function with full context
    emit Transfer(msg.sender, to, amount);
}
```

## Detection and Prevention

### During Development

**1. Code Review Checklist:**
- [ ] Are events emitted AFTER all state changes?
- [ ] Are events emitted AFTER all validation checks?
- [ ] Do event parameters match actual state changes?
- [ ] Are all state-changing operations logged with events?
- [ ] Do events include all relevant information?
- [ ] Are events emitted in external/public functions, not internal?

**2. Testing:**
```javascript
it("should emit event with correct values", async function () {
    const tx = await contract.transfer(recipient, amount);
    const receipt = await tx.wait();
    
    // Parse event
    const event = receipt.logs[0];
    const parsedEvent = contract.interface.parseLog(event);
    
    // Verify event values match actual state
    const recipientBalance = await contract.balances(recipient);
    expect(parsedEvent.args.amount).to.equal(recipientBalance);
});
```

### During Audit

**1. Event Emission Timing:**
- Check if events are emitted before state changes
- Look for events before require statements
- Identify events in try-catch blocks

**2. Event Accuracy:**
- Compare event parameters with actual state changes
- Look for calculations that differ between event and state
- Check for events with hardcoded or incorrect values

**3. Event Coverage:**
- Ensure all state changes have corresponding events
- Look for internal functions modifying state without events
- Check for missing events in error paths

### In Production

**1. Off-Chain Monitoring:**
```javascript
// Monitor for event-state discrepancies
async function validateEvents() {
    const events = await contract.queryFilter("Transfer");
    
    for (const event of events) {
        const { from, to, amount } = event.args;
        
        // Verify state matches event
        const toBalance = await contract.balances(to);
        const fromBalance = await contract.balances(from);
        
        // Check if balances are consistent with events
        if (discrepancyDetected) {
            alert("Event-state mismatch detected!");
        }
    }
}
```

**2. State Reconciliation:**
- Periodically compare event-derived state with actual on-chain state
- Flag discrepancies for investigation
- Rebuild indexes from actual state when mismatches found

## Best Practices

1. **Follow Checks-Effects-Interactions-Events Pattern**
   - Always emit events as the final step

2. **Emit Complete Information**
   - Include all amounts (gross, net, fees)
   - Add success/failure flags when applicable
   - Include block numbers and timestamps when relevant

3. **Test Event Emissions**
   - Verify event values match state changes
   - Test events in both success and failure scenarios
   - Check event ordering in complex transactions

4. **Document Event Semantics**
   - Clearly document what each event represents
   - Specify when events are emitted (before/after what operations)
   - Note any caveats or special conditions

5. **Version Events Carefully**
   - When changing event parameters, consider backward compatibility
   - Use different event names for different event versions
   - Document event schema changes

6. **Audit Event Usage**
   - Review all event emissions during code audits
   - Ensure off-chain systems handle events correctly
   - Validate event-based business logic

## Conclusion

Event-State Mismatch is a subtle but serious vulnerability that primarily affects off-chain systems and user experience. While the blockchain state remains correct, incorrect events can mislead indexers, UIs, and monitoring systems, causing confusion, incorrect displays, and potentially enabling exploit scenarios where attackers benefit from the mismatch.

By following the principle of emitting events AFTER all state changes and validations, using accurate event parameters, and thoroughly testing event emissions, developers can ensure that off-chain systems receive truthful information about on-chain state changes.
