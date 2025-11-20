# SC03: Logic Errors - Unfair Distribution

## Vulnerability Analysis

The `UnfairDistribution` contract is designed to distribute tokens to contributors based on their contributions. However, it contains a critical logic error that allows users to claim tokens without having made any contributions. This vulnerability can lead to an unfair distribution of tokens and a loss of funds for the contract owner and legitimate contributors.

### The Vulnerability

The logic error is in the `claim` function of the `UnfairDistribution` contract. The function checks if a user has already claimed their tokens but fails to verify if the user has made any contribution. This oversight allows anyone to call the `claim` function and receive tokens, even if their contribution amount is zero.

```solidity
// Vulnerable 'claim' function
function claim() external {
    require(!claimed[msg.sender], "You have already claimed your tokens");

    // The logic error: no check for contributions > 0
    uint256 userContribution = contributions[msg.sender];
    
    claimed[msg.sender] = true;
    payable(msg.sender).transfer(userContribution);

    emit Claimed(msg.sender, userContribution);
}
```

## Exploit

To exploit this vulnerability, an attacker can simply call the `claim` function without making any prior contribution. Since the contract does not check for a positive contribution balance, the transaction will succeed, and the attacker will be marked as having claimed tokens, even though they received nothing. While in this specific case the attacker gains no ether, it pollutes the contract's state and is a security risk.

### Attacker Contract

The `LogicErrorExploiter` contract demonstrates how to exploit this vulnerability. It calls the `claim` function of the `UnfairDistribution` contract, which will succeed due to the logic error.

```solidity
// Attacker's 'attack' function
function attack() external {
    vulnerableContract.claim();
}
```

## Mitigation

To fix this vulnerability, you should add a check in the `claim` function to ensure that the user has made a contribution before allowing them to claim tokens. This can be done by adding a `require` statement that checks if `contributions[msg.sender] > 0`.

### Patched `claim` Function

```solidity
// Patched 'claim' function
function claim() external {
    require(!claimed[msg.sender], "You have already claimed your tokens");
    require(contributions[msg.sender] > 0, "You have not made any contributions");

    uint256 userContribution = contributions[msg.sender];
    
    claimed[msg.sender] = true;
    payable(msg.sender).transfer(userContribution);

    emit Claimed(msg.sender, userContribution);
}
```

By adding this check, you ensure that only users who have contributed to the contract can claim tokens, preventing the unfair distribution and potential loss of funds.
