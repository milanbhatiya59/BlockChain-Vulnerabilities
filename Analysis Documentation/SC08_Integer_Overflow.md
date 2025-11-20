# SC08: Integer Overflow and Underflow

## Overview
Integer overflow and underflow vulnerabilities occur when arithmetic operations produce results that exceed the maximum or fall below the minimum values that can be stored in the data type. In Solidity versions before 0.8.0, these conditions would silently wrap around, leading to unexpected and potentially exploitable behavior.

## Vulnerability Description

### What is Integer Overflow/Underflow?

**Integer Overflow** occurs when an arithmetic operation produces a result larger than the maximum value the integer type can hold:
```solidity
// Example with uint8 (max value: 255)
uint8 value = 255;
value = value + 1;  // Overflows to 0 (in Solidity < 0.8.0)
```

**Integer Underflow** occurs when an arithmetic operation produces a result smaller than the minimum value (usually 0 for unsigned integers):
```solidity
// Example with uint256
uint256 value = 0;
value = value - 1;  // Underflows to 2^256 - 1 (in Solidity < 0.8.0)
```

### Why is it Dangerous?

1. **Silent Failures**: In Solidity < 0.8.0, overflow/underflow happens silently without reverting
2. **Balance Manipulation**: Attackers can gain unlimited tokens or bypass balance checks
3. **Access Control Bypass**: Time-based locks can be bypassed through timestamp overflow
4. **Financial Loss**: Users can lose funds due to incorrect calculations

## Technical Details

### Common Overflow/Underflow Scenarios

#### 1. Addition Overflow
```solidity
// VULNERABLE
function deposit(uint256 amount) external {
    balances[msg.sender] += amount;  // Can overflow in Solidity < 0.8.0
}
```

**Attack**: If `balances[msg.sender]` is near `type(uint256).max`, adding any amount will wrap to a small number.

#### 2. Subtraction Underflow
```solidity
// VULNERABLE
function withdraw(uint256 amount) external {
    balances[msg.sender] -= amount;  // Can underflow in Solidity < 0.8.0
}
```

**Attack**: Withdrawing more than balance will wrap to `type(uint256).max`, giving attacker unlimited tokens.

#### 3. Multiplication Overflow
```solidity
// VULNERABLE
function calculateCost(uint256 quantity, uint256 price) public pure returns (uint256) {
    return quantity * price;  // Can overflow
}
```

**Attack**: Large values can overflow to small numbers, allowing cheap purchases.

#### 4. Batch Operation Overflow
```solidity
// VULNERABLE
function batchTransfer(address[] calldata recipients, uint256 amount) external {
    uint256 totalRequired = recipients.length * amount;  // Can overflow!
    require(balances[msg.sender] >= totalRequired);
    // ... transfer logic
}
```

**Attack**: If `recipients.length * amount` overflows to 0, the require check passes but tokens are still transferred.

#### 5. Timestamp Overflow
```solidity
// VULNERABLE
function deposit(uint256 lockDuration) external payable {
    lockTime[msg.sender] = block.timestamp + lockDuration;  // Can overflow!
}
```

**Attack**: With large `lockDuration`, `block.timestamp + lockDuration` overflows to a small value, bypassing the time lock.

### Attack Vectors

#### Attack 1: Underflow to Gain Maximum Balance
```solidity
// Attacker with 0 balance
victim.vulnerableWithdraw(1);  // 0 - 1 = type(uint256).max
// Now attacker has maximum possible balance
```

#### Attack 2: Batch Transfer Overflow
```solidity
// If amount = 2^255 and recipients.length = 2
// Then: 2 * 2^255 = 2^256 = 0 (overflow)
// The require(balance >= 0) passes, but 2 * 2^255 tokens are transferred
```

#### Attack 3: Time Lock Bypass
```solidity
// Calculate overflow: lockDuration = type(uint256).max - block.timestamp + 1
// Result: block.timestamp + lockDuration overflows to 0 or 1
// Funds can be withdrawn immediately instead of being locked
```

## Real-World Examples

### 1. BeautyChain (BEC) Token - April 2018
- **Impact**: $900 million market cap wiped out
- **Vulnerability**: Batch transfer function with multiplication overflow
- **Code**: 
```solidity
function batchTransfer(address[] _receivers, uint256 _value) public {
    uint cnt = _receivers.length;
    uint256 amount = uint256(cnt) * _value;  // OVERFLOW!
    require(cnt > 0 && cnt <= 20);
    require(_value > 0 && balances[msg.sender] >= amount);
    // ...
}
```
- **Exploit**: Attacker sent `_value = 2^255` with 2 recipients, causing `amount` to overflow to 0

### 2. SMT Token - April 2018
- **Impact**: Trading suspended on multiple exchanges
- **Vulnerability**: Similar batch transfer overflow
- **Result**: Attacker created tokens from nothing

### 3. ProxyOverflow - 2018
- **Impact**: Multiple tokens affected
- **Vulnerability**: Proxy contract with unchecked arithmetic
- **Lesson**: Even proxy contracts need overflow protection

## Code Examples

### Vulnerable Contract (Solidity 0.7.x)
```solidity
pragma solidity ^0.7.6;

contract VulnerableToken {
    mapping(address => uint256) public balances;
    
    // VULNERABLE: Addition overflow
    function deposit(uint256 amount) external {
        balances[msg.sender] += amount;
    }
    
    // VULNERABLE: Subtraction underflow
    function withdraw(uint256 amount) external {
        balances[msg.sender] -= amount;
    }
    
    // VULNERABLE: Multiplication overflow
    function buy(uint256 quantity) external payable {
        uint256 price = 1 ether;
        uint256 cost = quantity * price;  // Can overflow!
        require(msg.value >= cost);
        balances[msg.sender] += quantity;
    }
}
```

### Secure Contract (Using SafeMath - Pre 0.8.0)
```solidity
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract SecureToken {
    using SafeMath for uint256;
    mapping(address => uint256) public balances;
    
    // SAFE: Addition with overflow check
    function deposit(uint256 amount) external {
        balances[msg.sender] = balances[msg.sender].add(amount);
    }
    
    // SAFE: Subtraction with underflow check
    function withdraw(uint256 amount) external {
        balances[msg.sender] = balances[msg.sender].sub(amount);
    }
    
    // SAFE: Multiplication with overflow check
    function buy(uint256 quantity) external payable {
        uint256 price = 1 ether;
        uint256 cost = quantity.mul(price);
        require(msg.value >= cost);
        balances[msg.sender] = balances[msg.sender].add(quantity);
    }
}
```

### Modern Secure Contract (Solidity 0.8.0+)
```solidity
pragma solidity ^0.8.0;

contract ModernSecureToken {
    mapping(address => uint256) public balances;
    
    // SAFE: Built-in overflow protection
    function deposit(uint256 amount) external {
        balances[msg.sender] += amount;  // Automatically reverts on overflow
    }
    
    // SAFE: Built-in underflow protection
    function withdraw(uint256 amount) external {
        balances[msg.sender] -= amount;  // Automatically reverts on underflow
    }
    
    // SAFE: Built-in multiplication overflow protection
    function buy(uint256 quantity) external payable {
        uint256 price = 1 ether;
        uint256 cost = quantity * price;  // Automatically reverts on overflow
        require(msg.value >= cost);
        balances[msg.sender] += quantity;
    }
}
```

## Detection Methods

### Static Analysis
1. **Check Solidity Version**: Contracts using `< 0.8.0` need SafeMath
2. **Identify Arithmetic Operations**: Look for `+`, `-`, `*`, `++`, `--`, `+=`, `-=`
3. **Check for SafeMath**: Ensure SafeMath is used for all arithmetic
4. **Small Integer Types**: `uint8`, `uint16` are more prone to overflow
5. **Array Length Multiplication**: `array.length * value` can overflow

### Dynamic Analysis
1. **Test Edge Cases**: Use maximum and minimum values
2. **Test Underflow**: Try operations with 0 balance
3. **Test Overflow**: Try operations with maximum balance
4. **Fuzzing**: Use tools like Echidna to test random inputs

### Tools
- **Slither**: Detects missing overflow checks
- **Mythril**: Symbolic execution to find overflow vulnerabilities
- **Securify**: Formal verification of arithmetic safety
- **Echidna**: Fuzzing for overflow conditions

## Mitigation Strategies

### 1. Use Solidity 0.8.0 or Later ✅ RECOMMENDED
```solidity
pragma solidity ^0.8.0;

// Built-in overflow/underflow protection
function transfer(uint256 amount) external {
    balances[msg.sender] -= amount;  // Reverts on underflow
    balances[recipient] += amount;   // Reverts on overflow
}
```

**Pros**:
- Automatic protection
- No extra code needed
- Gas efficient

**Cons**:
- May need to use `unchecked` for intentional wrapping

### 2. Use SafeMath Library (Pre 0.8.0)
```solidity
pragma solidity ^0.7.6;

using SafeMath for uint256;

function transfer(uint256 amount) external {
    balances[msg.sender] = balances[msg.sender].sub(amount);
    balances[recipient] = balances[recipient].add(amount);
}
```

### 3. Manual Checks
```solidity
function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "Addition overflow");
    return c;
}

function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, "Subtraction underflow");
    return a - b;
}

function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) return 0;
    uint256 c = a * b;
    require(c / a == b, "Multiplication overflow");
    return c;
}
```

### 4. Input Validation
```solidity
function deposit(uint256 lockDuration) external payable {
    // Validate reasonable duration (e.g., max 10 years)
    require(lockDuration <= 315360000, "Duration too long");
    lockTime[msg.sender] = block.timestamp + lockDuration;
}
```

### 5. Use uint256
```solidity
// PREFER
uint256 public balance;  // Less likely to overflow

// AVOID
uint8 public balance;    // Easily overflows at 255
```

## Testing

### Test Cases
```javascript
describe("Integer Overflow Tests", function() {
    it("Should revert on addition overflow", async function() {
        const maxUint256 = ethers.constants.MaxUint256;
        await expect(
            contract.deposit(maxUint256)
        ).to.be.reverted;
    });
    
    it("Should revert on subtraction underflow", async function() {
        await expect(
            contract.withdraw(1)  // Withdraw from 0 balance
        ).to.be.reverted;
    });
    
    it("Should revert on multiplication overflow", async function() {
        const largeValue = ethers.BigNumber.from(2).pow(255);
        await expect(
            contract.multiply(largeValue, 2)
        ).to.be.reverted;
    });
});
```

## Best Practices

### ✅ DO:
1. **Always use Solidity 0.8.0+** for new contracts
2. **Use SafeMath** for contracts that must use older versions
3. **Validate inputs** to ensure they're in reasonable ranges
4. **Test edge cases** with maximum and minimum values
5. **Use uint256** as the default integer type
6. **Document** any intentional use of `unchecked` blocks

### ❌ DON'T:
1. **Don't use unchecked arithmetic** without thorough analysis
2. **Don't trust user inputs** for arithmetic operations
3. **Don't use small integer types** unless necessary
4. **Don't ignore compiler warnings** about overflow
5. **Don't assume** calculations will never overflow

## Prevention Checklist

- [ ] Using Solidity ^0.8.0 or later?
- [ ] If using < 0.8.0, is SafeMath imported and used?
- [ ] Are all arithmetic operations protected?
- [ ] Are user inputs validated for reasonable ranges?
- [ ] Are timestamp calculations protected from overflow?
- [ ] Are batch operations checked for overflow?
- [ ] Is uint256 used instead of smaller types?
- [ ] Are there tests for overflow/underflow conditions?
- [ ] Has static analysis been run (Slither, Mythril)?
- [ ] Are there comments explaining any `unchecked` blocks?

## References

### Academic Papers
1. "Analysis of Ethereum Smart Contract Security Vulnerabilities" - IEEE, 2020
2. "Integer Overflow Study in Ethereum Smart Contracts" - ACM, 2019

### Vulnerability Databases
- [SWC-101: Integer Overflow and Underflow](https://swcregistry.io/docs/SWC-101)
- [DASP Top 10: Arithmetic Issues](https://dasp.co/)

### Tools & Resources
- [OpenZeppelin SafeMath](https://docs.openzeppelin.com/contracts/2.x/api/math)
- [Solidity 0.8.0 Release Notes](https://blog.soliditylang.org/2020/12/16/solidity-0.8.0-release-announcement/)
- [Consensys Best Practices](https://consensys.github.io/smart-contract-best-practices/)

### Historical Incidents
- [BeautyChain (BEC) Overflow](https://medium.com/@peckshield/alert-new-batchoverflow-bug-in-multiple-erc20-smart-contracts-cve-2018-10299-511067db6536)
- [SMT Token Overflow](https://medium.com/@jonghyk.song/proxyoverflow-more-than-a-dozen-ethereum-contracts-vulnerable-50654b5e5e2d)

## Conclusion

Integer overflow and underflow vulnerabilities were a major concern in early Ethereum smart contracts, leading to massive financial losses. The introduction of automatic overflow checking in Solidity 0.8.0 has significantly improved the security landscape. However, developers must still be vigilant when:

1. Maintaining legacy contracts (< 0.8.0)
2. Using `unchecked` blocks for gas optimization
3. Working with time-based calculations
4. Handling user inputs in arithmetic operations

Always prioritize using Solidity 0.8.0+ for new contracts, thoroughly test arithmetic operations, and use static analysis tools to detect potential vulnerabilities.

---

**Last Updated**: 2025  
**Severity**: HIGH (Pre 0.8.0) / LOW (Post 0.8.0 with proper usage)  
**OWASP Category**: A03:2021 – Injection (Arithmetic Manipulation)
