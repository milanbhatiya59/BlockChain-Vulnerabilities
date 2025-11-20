# SC04: Lack of Input Validation

## Vulnerability Analysis

The `TokenSale` contract is designed to facilitate the sale of tokens to users. However, it suffers from a critical security flaw: **lack of proper input validation**. This vulnerability allows attackers to exploit various functions by passing invalid or malicious inputs that the contract fails to reject.

### The Vulnerability

Input validation is a fundamental security practice that ensures all user-supplied data meets the expected criteria before being processed. The `TokenSale` contract fails to validate inputs in several critical functions:

#### 1. **Purchase Tokens Without Payment**

The `purchaseTokens` function doesn't verify that the ETH sent (`msg.value`) matches the required payment:

```solidity
function purchaseTokens(uint256 amount) external payable {
    // Missing: require(msg.value == amount * tokenPrice, "Incorrect payment");
    // Missing: require(amount > 0, "Amount must be greater than 0");
    
    balances[msg.sender] += amount;
    soldTokens += amount;
}
```

**Exploit**: An attacker can call `purchaseTokens(10)` with `msg.value = 0`, obtaining tokens for free.

#### 2. **Exceed Token Supply**

The function doesn't check if the purchase would exceed the total available supply:

```solidity
// Missing: require(soldTokens + amount <= totalSupply, "Exceeds supply");
```

**Exploit**: An attacker can purchase more tokens than exist, breaking the token economics.

#### 3. **Transfer to Zero Address**

The `transfer` function doesn't validate the recipient address:

```solidity
function transfer(address to, uint256 amount) external {
    // Missing: require(to != address(0), "Cannot transfer to zero address");
    // Missing: require(amount > 0, "Amount must be greater than 0");
    // Missing: require(balances[msg.sender] >= amount, "Insufficient balance");
    
    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

**Exploit**: Tokens can be sent to the zero address, effectively burning them and causing loss of funds.

#### 4. **Unauthorized Access**

Functions like `setTokenPrice` and `withdraw` lack access control:

```solidity
function setTokenPrice(uint256 newPrice) external {
    // Missing: require(msg.sender == owner, "Only owner");
    // Missing: require(newPrice > 0, "Price must be greater than 0");
    
    tokenPrice = newPrice;
}
```

**Exploit**: Anyone can change the token price or withdraw contract funds.

## Exploitation Scenarios

### Attack 1: Free Token Purchase
```solidity
vulnerableContract.purchaseTokens{value: 0}(100);
// Attacker gets 100 tokens without paying
```

### Attack 2: Supply Overflow
```solidity
vulnerableContract.purchaseTokens{value: msg.value}(1000000);
// Even if total supply is 1000, attacker can purchase 1,000,000 tokens
```

### Attack 3: Burn Tokens to Zero Address
```solidity
vulnerableContract.transfer(address(0), amount);
// Tokens are lost forever
```

### Attack 4: Price Manipulation
```solidity
vulnerableContract.setTokenPrice(1 wei);
// Anyone can set token price to nearly zero
```

### Attack 5: Unauthorized Withdrawal
```solidity
vulnerableContract.withdraw();
// Anyone can drain all ETH from the contract
```

## Impact

- **Financial Loss**: Attackers can obtain tokens for free or drain contract funds
- **Token Economics破坏**: Supply limits can be exceeded, devaluing the token
- **Loss of Control**: Unauthorized users can modify critical parameters
- **Permanent Loss**: Tokens sent to zero address cannot be recovered
- **Trust Erosion**: Users lose confidence in the platform

## Mitigation

To fix these vulnerabilities, implement comprehensive input validation:

### Patched `purchaseTokens` Function

```solidity
function purchaseTokens(uint256 amount) external payable {
    require(amount > 0, "Amount must be greater than 0");
    require(soldTokens + amount <= totalSupply, "Exceeds available supply");
    require(msg.value == amount * tokenPrice, "Incorrect payment amount");
    
    balances[msg.sender] += amount;
    soldTokens += amount;
    
    emit TokensPurchased(msg.sender, amount, msg.value);
}
```

### Patched `transfer` Function

```solidity
function transfer(address to, uint256 amount) external {
    require(to != address(0), "Cannot transfer to zero address");
    require(amount > 0, "Amount must be greater than 0");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    balances[msg.sender] -= amount;
    balances[to] += amount;
    
    emit TokensTransferred(msg.sender, to, amount);
}
```

### Patched `setTokenPrice` Function

```solidity
function setTokenPrice(uint256 newPrice) external {
    require(msg.sender == owner, "Only owner can set price");
    require(newPrice > 0, "Price must be greater than 0");
    
    tokenPrice = newPrice;
}
```

### Patched `withdraw` Function

```solidity
function withdraw() external {
    require(msg.sender == owner, "Only owner can withdraw");
    
    payable(msg.sender).transfer(address(this).balance);
}
```

## Best Practices

1. **Always Validate Inputs**: Check all user-supplied data before processing
2. **Use Modifiers**: Create reusable `onlyOwner` and validation modifiers
3. **Check Boundaries**: Validate that values are within acceptable ranges
4. **Verify Addresses**: Ensure addresses are not zero or invalid
5. **Validate Payments**: Always verify that `msg.value` matches expected amounts
6. **Follow Checks-Effects-Interactions**: Validate inputs first, then modify state
7. **Use OpenZeppelin**: Leverage battle-tested libraries like `Ownable` and `SafeMath`
8. **Comprehensive Testing**: Test edge cases and invalid inputs
9. **Code Reviews**: Have security experts review your validation logic
10. **Static Analysis**: Use tools like Slither, Mythril, and Solhint to detect missing validations
