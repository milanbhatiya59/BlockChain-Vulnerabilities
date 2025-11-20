# SC07: Flash Loan Attacks

## Vulnerability Analysis

Flash loans are a powerful DeFi primitive that allows users to borrow large amounts of assets without collateral, as long as the loan is repaid within the same transaction. While flash loans have legitimate use cases like arbitrage and liquidations, they can also be weaponized to exploit vulnerabilities in smart contracts that weren't designed with flash loan attacks in mind.

### What are Flash Loans?

Flash loans are uncollateralized loans that must be borrowed and repaid within a single atomic transaction. If the borrower cannot repay the loan (plus fees) by the end of the transaction, the entire transaction reverts as if it never happened.

**Key characteristics:**
- **Uncollateralized**: No collateral required
- **Atomic**: Must be borrowed and repaid in one transaction
- **Large amounts**: Can borrow millions of dollars
- **Low cost**: Only pay gas fees and loan fees (typically 0.05-0.09%)

### Common Flash Loan Attack Vectors

Flash loans enable attackers to temporarily obtain massive capital to exploit vulnerabilities in DeFi protocols:

#### 1. **Governance Manipulation**

Protocols using token-based voting without proper safeguards are vulnerable to governance attacks.

```solidity
// VULNERABLE: Voting power can be acquired and used immediately
function depositForVoting() external payable {
    votingPower[msg.sender] += msg.value;
}

function vote(uint256 proposalId, bool support) external {
    uint256 weight = votingPower[msg.sender]; // Instant voting power!
    // Vote with borrowed funds...
}
```

**Attack Flow:**
1. Attacker takes a flash loan of 10,000 ETH
2. Deposits 10,000 ETH to get massive voting power
3. Votes on a malicious proposal with overwhelming power
4. Withdraws the 10,000 ETH
5. Repays the flash loan
6. Malicious proposal passes

#### 2. **Price Oracle Manipulation**

DEXes and protocols that calculate prices based on instant reserve ratios are vulnerable.

```solidity
// VULNERABLE: Price based on instant reserves
function getPrice() external view returns (uint256) {
    return (ethReserve * 1e18) / tokenReserve;
}
```

**Attack Flow:**
1. Attacker takes a flash loan of 5,000 ETH
2. Swaps 5,000 ETH for tokens, drastically changing the reserve ratio
3. Price oracle reports manipulated price
4. Attacker exploits the manipulated price (e.g., liquidates positions, mints cheap tokens)
5. Swaps tokens back for ETH
6. Repays the flash loan
7. Keeps the profit from the manipulation

#### 3. **Reentrancy with Flash Loans**

Combining flash loans with reentrancy attacks amplifies the damage.

**Attack Flow:**
1. Flash loan large amount
2. Trigger reentrancy vulnerability
3. Drain more funds than would be possible without the loan
4. Repay flash loan
5. Keep the profit

## Real-World Examples

### 1. Harvest Finance (2020) - $34 Million

- Attacker used flash loans to manipulate prices on Curve pools
- Exploited the price difference to profit from Harvest's vaults
- **Loss**: $34 million

### 2. bZx Attacks (2020) - $954,000

- Multiple attacks using flash loans
- Manipulated oracle prices and exploited trading logic
- **Loss**: ~$954,000 across multiple attacks

### 3. Cream Finance (2021) - $130 Million

- Flash loan attack combined with price oracle manipulation
- **Loss**: $130 million

### 4. Alpha Homora (2021) - $37 Million

- Exploited interaction between Iron Bank and Alpha Homora
- Used flash loans to drain funds
- **Loss**: $37 million

## Vulnerable Code Examples

### Vulnerable Governance Contract

```solidity
contract VulnerableGovernance {
    mapping(address => uint256) public votingPower;
    
    // VULNERABILITY: No timelock or snapshot
    function depositForVoting() external payable {
        votingPower[msg.sender] += msg.value;
    }
    
    function vote(uint256 proposalId, bool support) external {
        uint256 weight = votingPower[msg.sender];
        // Can vote immediately after depositing flash-loaned funds
        proposals[proposalId].votes[support] += weight;
    }
    
    function withdrawFromVoting(uint256 amount) external {
        votingPower[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}
```

### Vulnerable Price Oracle

```solidity
contract VulnerablePriceOracle {
    uint256 public tokenReserve;
    uint256 public ethReserve;
    
    // VULNERABILITY: Instant price calculation
    function getPrice() external view returns (uint256) {
        return (ethReserve * 1e18) / tokenReserve;
    }
    
    function swap(uint256 amount, bool buyTokens) external payable {
        // Swapping changes reserves instantly
        // Price can be manipulated within a single transaction
    }
}
```

## Impact

- **Financial Loss**: Millions of dollars drained from protocols
- **Governance Takeover**: Malicious proposals can pass
- **Market Manipulation**: Prices can be artificially inflated or deflated
- **Loss of User Trust**: Users lose confidence in DeFi protocols
- **Protocol Insolvency**: Entire protocols can become insolvent
- **Systemic Risk**: Cascading failures across interconnected protocols

## Mitigation Strategies

### 1. Time-Locked Governance

Implement delays between depositing and voting:

```solidity
contract SecureGovernance {
    mapping(address => uint256) public votingPower;
    mapping(address => uint256) public depositBlock;
    
    uint256 public constant VOTING_DELAY = 1; // 1 block delay
    
    function depositForVoting() external payable {
        votingPower[msg.sender] += msg.value;
        depositBlock[msg.sender] = block.number;
    }
    
    function vote(uint256 proposalId, bool support) external {
        // Require at least 1 block has passed
        require(
            block.number > depositBlock[msg.sender] + VOTING_DELAY,
            "Must wait before voting"
        );
        
        uint256 weight = votingPower[msg.sender];
        proposals[proposalId].votes[support] += weight;
    }
}
```

### 2. Snapshot-Based Voting

Record voting power at specific block numbers:

```solidity
contract SnapshotGovernance {
    mapping(uint256 => mapping(address => uint256)) public votingPowerAtBlock;
    
    struct Proposal {
        uint256 snapshotBlock;
        // ... other fields
    }
    
    function createProposal(string memory description) external returns (uint256) {
        uint256 proposalId = proposalCount++;
        proposals[proposalId].snapshotBlock = block.number;
        // Record voting power at this block
    }
    
    function vote(uint256 proposalId, bool support) external {
        // Use voting power from snapshot block, not current balance
        uint256 weight = votingPowerAtBlock[proposals[proposalId].snapshotBlock][msg.sender];
        require(weight > 0, "No voting power at snapshot");
        
        proposals[proposalId].votes[support] += weight;
    }
}
```

### 3. Time-Weighted Average Price (TWAP)

Use TWAP oracles instead of spot prices:

```solidity
contract TWAPOracle {
    struct PriceObservation {
        uint256 timestamp;
        uint256 price;
    }
    
    PriceObservation[] public priceHistory;
    uint256 public constant TWAP_PERIOD = 30 minutes;
    
    function updatePrice() external {
        uint256 currentPrice = calculateSpotPrice();
        priceHistory.push(PriceObservation({
            timestamp: block.timestamp,
            price: currentPrice
        }));
    }
    
    function getTWAP() external view returns (uint256) {
        require(priceHistory.length > 0, "No price data");
        
        uint256 timeWeightedSum = 0;
        uint256 totalWeight = 0;
        uint256 cutoffTime = block.timestamp - TWAP_PERIOD;
        
        for (uint256 i = priceHistory.length; i > 0; i--) {
            PriceObservation memory obs = priceHistory[i - 1];
            
            if (obs.timestamp < cutoffTime) break;
            
            uint256 weight = obs.timestamp - 
                (i > 1 ? priceHistory[i - 2].timestamp : cutoffTime);
            
            timeWeightedSum += obs.price * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? timeWeightedSum / totalWeight : priceHistory[priceHistory.length - 1].price;
    }
}
```

### 4. Use Chainlink or Other Decentralized Oracles

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceConsumer {
    AggregatorV3Interface internal priceFeed;
    
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function getLatestPrice() public view returns (int) {
        (
            ,
            int price,
            ,
            ,
        ) = priceFeed.latestRoundData();
        return price;
    }
}
```

### 5. Flash Loan Protection

Implement flash loan detection and protection:

```solidity
contract FlashLoanProtected {
    mapping(address => uint256) public lastActionBlock;
    
    modifier noFlashLoan() {
        require(
            lastActionBlock[msg.sender] != block.number,
            "No flash loans"
        );
        _;
        lastActionBlock[msg.sender] = block.number;
    }
    
    function deposit() external payable noFlashLoan {
        // Deposit logic
    }
    
    function withdraw() external noFlashLoan {
        // Withdraw logic
    }
}
```

### 6. Implement Flash Loan Fees

Make attacks economically unviable:

```solidity
contract FlashLoanProvider {
    uint256 public constant FEE_RATE = 9; // 0.09% fee
    
    function flashLoan(uint256 amount) external {
        uint256 balanceBefore = address(this).balance;
        uint256 fee = (amount * FEE_RATE) / 10000;
        
        // Send loan
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // Require repayment with fee
        uint256 balanceAfter = address(this).balance;
        require(
            balanceAfter >= balanceBefore + fee,
            "Flash loan not repaid with fee"
        );
    }
}
```

## Best Practices

1. **Never rely on spot prices** - Use TWAP or external oracles
2. **Implement time delays** - Add delays between state-changing actions
3. **Use snapshots** - Record state at specific blocks for governance
4. **Add flash loan guards** - Prevent same-block actions
5. **Charge fees** - Make attacks expensive
6. **Use reentrancy guards** - Prevent reentrancy attacks
7. **Limit transaction impact** - Cap the maximum change in a single transaction
8. **Monitor unusual activity** - Implement alerts for large transactions
9. **Multi-oracle approach** - Use multiple price sources
10. **Regular audits** - Have security experts review your code
11. **Bug bounties** - Incentivize white-hat hackers to find vulnerabilities
12. **Circuit breakers** - Implement emergency pause mechanisms

## Conclusion

Flash loan attacks represent one of the most significant threats to DeFi protocols. The ability to borrow massive amounts of capital without collateral enables attackers to exploit vulnerabilities that would otherwise require substantial funds. By understanding flash loan attack vectors and implementing proper safeguards like time delays, TWAP oracles, and flash loan protection, developers can build more resilient DeFi protocols.
