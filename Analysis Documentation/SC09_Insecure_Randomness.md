# SC09: Insecure Randomness

## Overview
Insecure randomness is a critical vulnerability in smart contracts where predictable or manipulatable sources are used to generate random numbers. Since blockchain is deterministic by nature, generating truly random numbers is challenging. Using weak entropy sources like `block.timestamp`, `block.number`, or `blockhash` allows attackers to predict outcomes and exploit games, lotteries, NFT mints, and other systems requiring randomness.

## Vulnerability Description

### What is Insecure Randomness?

Insecure randomness occurs when smart contracts use predictable blockchain data as sources of randomness. Common weak sources include:

- **block.timestamp**: Manipulatable by miners within ~15 seconds
- **block.number**: Completely predictable
- **blockhash**: Known for past blocks, manipulatable for future blocks
- **msg.sender**: Known to the caller
- **block.prevrandao** (formerly difficulty): Influenced by validators
- **Combinations of the above**: Still predictable when combined

### Why is it Dangerous?

1. **Financial Loss**: Attackers can drain jackpots, win lotteries with 100% success
2. **Unfair Games**: Games of chance become games of certainty for attackers
3. **NFT Manipulation**: Rare/valuable NFTs can be minted exclusively by attackers
4. **Winner Selection Bias**: Governance or prize distributions can be manipulated

## Technical Details

### Weak Randomness Sources

#### 1. block.timestamp
```solidity
// ❌ VULNERABLE
function playLottery() external payable {
    uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp))) % 100;
    if (random < 10) {
        payable(msg.sender).transfer(jackpot);
    }
}
```

**Attack**: Miner can manipulate timestamp by ~15 seconds. Attacker can also predict timestamp of next block and only call when favorable.

**Impact**: Attackers can predict outcomes and participate only when they'll win.

#### 2. block.number
```solidity
// ❌ VULNERABLE
function playLottery() external payable {
    uint256 random = uint256(keccak256(abi.encodePacked(block.number))) % 100;
    if (random < 10) {
        payable(msg.sender).transfer(jackpot);
    }
}
```

**Attack**: Block number is completely predictable. Attacker knows current block number and can calculate outcome.

**Impact**: 100% predictable outcomes.

#### 3. blockhash
```solidity
// ❌ VULNERABLE
function playLottery() external payable {
    uint256 random = uint256(blockhash(block.number - 1)) % 100;
    if (random < 10) {
        payable(msg.sender).transfer(jackpot);
    }
}
```

**Attack**: 
- For past blocks: blockhash is already known
- For current block: blockhash is available in same transaction
- Miners can influence blockhash

**Impact**: Predictable for attackers in same transaction.

#### 4. msg.sender
```solidity
// ❌ VULNERABLE
function playLottery() external payable {
    uint256 random = uint256(keccak256(abi.encodePacked(msg.sender))) % 100;
    if (random < 10) {
        payable(msg.sender).transfer(jackpot);
    }
}
```

**Attack**: Attacker always knows their own address. Can compute outcome before calling.

**Impact**: Attacker can simulate transaction off-chain first.

#### 5. Combined Weak Sources
```solidity
// ❌ STILL VULNERABLE
function playLottery() external payable {
    uint256 random = uint256(keccak256(abi.encodePacked(
        block.timestamp,
        block.number,
        msg.sender
    ))) % 100;
    
    if (random < 10) {
        payable(msg.sender).transfer(jackpot);
    }
}
```

**Attack**: All sources are known to attacker in same transaction. Combining weak entropy doesn't create strong entropy.

**Impact**: Still 100% predictable.

### Attack Patterns

#### Attack Pattern 1: Pre-computation
```solidity
// Attacker contract
function attack() external payable {
    // Calculate same "random" value as victim
    uint256 predictedRandom = uint256(keccak256(abi.encodePacked(
        block.timestamp
    ))) % 100;
    
    // Only call if we'll win
    if (predictedRandom < 10) {
        victim.playLottery{value: 0.1 ether}();
        // Guaranteed win!
    }
}
```

#### Attack Pattern 2: Brute Force Blocks
```solidity
// Attacker contract
function attackWhenFavorable() external {
    uint256 predictedRandom = calculateRandom();
    
    if (predictedRandom == 0) {  // Rare outcome
        victim.mintRareNFT();
    } else {
        revert("Not favorable, try next block");
    }
}
```

## Real-World Examples

### 1. SmartBillions Lottery - 2017
- **Impact**: $400,000+ potential loss
- **Vulnerability**: Used `block.number` for random number generation
- **Exploit**: Attacker could predict winning numbers
- **Outcome**: Found and disclosed before major exploitation

### 2. Fomo3D - 2018
- **Impact**: Exit scam concerns
- **Vulnerability**: Used `block.timestamp` for game mechanics
- **Issue**: Miners could manipulate timing to win jackpot
- **Outcome**: Community concerns about fairness

### 3. Meebits NFT - 2021
- **Impact**: Rarity manipulation concerns
- **Vulnerability**: Initial random generation implementation concerns
- **Mitigation**: Used Chainlink VRF in final version
- **Lesson**: High-value NFTs need provably fair randomness

### 4. TheRun Game - 2018
- **Impact**: Game exploited
- **Vulnerability**: Blockhash-based randomness
- **Exploit**: Players predicted outcomes
- **Outcome**: Game had to be restructured

## Code Examples

### Vulnerable Contract
```solidity
pragma solidity ^0.8.0;

contract VulnerableLottery {
    uint256 public jackpot;
    
    // ❌ VULNERABLE: Using block.timestamp
    function playLottery() external payable {
        require(msg.value >= 0.1 ether);
        jackpot += msg.value;
        
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp
        ))) % 100;
        
        if (random < 10) {  // 10% chance
            payable(msg.sender).transfer(jackpot);
            jackpot = 0;
        }
    }
}
```

### Attacker Contract
```solidity
contract LotteryAttacker {
    VulnerableLottery victim;
    
    function attack() external payable {
        // Pre-compute the random value
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(
            block.timestamp
        ))) % 100;
        
        // Only play if we'll win
        if (predictedRandom < 10) {
            victim.playLottery{value: msg.value}();
            // Guaranteed win!
        }
    }
}
```

### Secure Contract (Chainlink VRF)
```solidity
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract SecureLottery is VRFConsumerBase {
    uint256 public jackpot;
    bytes32 internal keyHash;
    uint256 internal fee;
    
    mapping(bytes32 => address) public requestIdToPlayer;
    
    constructor(address _vrfCoordinator, address _link, bytes32 _keyHash, uint256 _fee)
        VRFConsumerBase(_vrfCoordinator, _link)
    {
        keyHash = _keyHash;
        fee = _fee;
    }
    
    // ✅ SECURE: Request randomness from Chainlink VRF
    function playLottery() external payable returns (bytes32 requestId) {
        require(msg.value >= 0.1 ether, "Minimum bet");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        
        jackpot += msg.value;
        
        // Request random number from Chainlink VRF
        requestId = requestRandomness(keyHash, fee);
        requestIdToPlayer[requestId] = msg.sender;
        
        return requestId;
    }
    
    // ✅ SECURE: Callback with verifiable random number
    function fulfillRandomness(bytes32 requestId, uint256 randomness) 
        internal 
        override 
    {
        address player = requestIdToPlayer[requestId];
        uint256 random = randomness % 100;
        
        if (random < 10) {  // 10% chance
            payable(player).transfer(jackpot);
            jackpot = 0;
        }
    }
}
```

### Secure Contract (Commit-Reveal)
```solidity
pragma solidity ^0.8.0;

contract CommitRevealLottery {
    uint256 public jackpot;
    
    struct Commitment {
        bytes32 commitment;
        uint256 commitTime;
        uint256 bet;
        bool revealed;
    }
    
    mapping(address => Commitment) public commitments;
    
    // Step 1: Commit to a secret value
    function commit(bytes32 _commitment) external payable {
        require(msg.value >= 0.1 ether, "Minimum bet");
        require(commitments[msg.sender].commitTime == 0, "Already committed");
        
        commitments[msg.sender] = Commitment({
            commitment: _commitment,
            commitTime: block.timestamp,
            bet: msg.value,
            revealed: false
        });
        
        jackpot += msg.value;
    }
    
    // Step 2: Reveal the secret after waiting period
    function reveal(uint256 _secret) external {
        Commitment storage c = commitments[msg.sender];
        require(c.commitTime > 0, "No commitment");
        require(!c.revealed, "Already revealed");
        require(block.timestamp >= c.commitTime + 1 minutes, "Wait period not over");
        
        // Verify the commitment matches
        require(keccak256(abi.encodePacked(_secret)) == c.commitment, "Invalid secret");
        
        c.revealed = true;
        
        // Use the revealed secret for randomness
        uint256 random = uint256(keccak256(abi.encodePacked(
            _secret,
            block.timestamp,
            block.number
        ))) % 100;
        
        if (random < 10) {
            payable(msg.sender).transfer(jackpot);
            jackpot = 0;
        }
        
        delete commitments[msg.sender];
    }
}
```

## Detection Methods

### Static Analysis
1. **Search for Block Variables in Random Generation**:
   - `block.timestamp` in keccak256
   - `block.number` in keccak256
   - `blockhash()` calls
   - `block.prevrandao` in calculations

2. **Check for msg.sender in Randomness**:
   - `msg.sender` used in random calculations
   - `tx.origin` used in random calculations

3. **Look for Financial Consequences**:
   - Transfer or mint based on "random" values
   - Winner selection using weak randomness
   - Rarity determination in NFTs

### Dynamic Analysis
1. **Test Predictability**: Calculate outcomes before calling functions
2. **Simulate Attacks**: Create attacker contract that predicts outcomes
3. **Check Multiple Calls**: See if outcomes can be predicted across calls

### Tools
- **Slither**: Detects weak randomness patterns
- **Mythril**: Identifies randomness vulnerabilities
- **MythX**: Comprehensive randomness analysis
- **Manual Review**: Always review random number generation

## Mitigation Strategies

### 1. Use Chainlink VRF (Recommended) ✅

**Chainlink VRF** (Verifiable Random Function) provides cryptographically secure randomness:

```solidity
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract MyContract is VRFConsumerBase {
    bytes32 internal keyHash;
    uint256 internal fee;
    
    function requestRandomness() external {
        requestRandomness(keyHash, fee);
    }
    
    function fulfillRandomness(bytes32 requestId, uint256 randomness) 
        internal override 
    {
        // Use randomness here
    }
}
```

**Pros**:
- Cryptographically secure
- Verifiable on-chain
- Cannot be manipulated
- Industry standard

**Cons**:
- Requires LINK tokens
- Two-transaction process
- Additional gas costs

### 2. Commit-Reveal Scheme ✅

Two-step process where users commit to a value then reveal it:

```solidity
// Step 1: Commit
function commit(bytes32 hash) external {
    commitments[msg.sender] = hash;
    commitTime[msg.sender] = block.timestamp;
}

// Step 2: Reveal (after delay)
function reveal(uint256 secret) external {
    require(block.timestamp > commitTime[msg.sender] + MIN_DELAY);
    require(keccak256(abi.encodePacked(secret)) == commitments[msg.sender]);
    // Use secret
}
```

**Pros**:
- No external dependencies
- More gas efficient than VRF
- Simple to implement

**Cons**:
- Two-step process
- Users can abandon if unfavorable
- Requires careful timing

### 3. Block Hash of Future Block ✅

Request in one block, fulfill using hash of future block:

```solidity
mapping(address => uint256) public requestBlock;

function requestRandom() external {
    requestBlock[msg.sender] = block.number + 1;
}

function claimRandom() external {
    uint256 reqBlock = requestBlock[msg.sender];
    require(block.number > reqBlock, "Too early");
    require(block.number <= reqBlock + 256, "Too late");
    
    uint256 random = uint256(blockhash(reqBlock));
    // Use random
}
```

**Pros**:
- No external dependencies
- Simple implementation

**Cons**:
- Limited to 256 blocks
- Miners can still influence
- Not fully secure

### 4. Multi-Party Computation ✅

Combine inputs from multiple parties:

```solidity
uint256 public seedPart1;  // From party 1
uint256 public seedPart2;  // From party 2
uint256 public seedPart3;  // From party 3

function generateRandom() internal view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(
        seedPart1,
        seedPart2,
        seedPart3
    )));
}
```

**Pros**:
- Decentralized
- Hard to manipulate all parties

**Cons**:
- Coordination complexity
- Requires trust in parties

## Best Practices

### ✅ DO:
1. **Use Chainlink VRF** for high-value applications (lotteries, high-value NFTs)
2. **Implement commit-reveal** for simpler use cases
3. **Separate request from fulfillment** (two-step process)
4. **Document randomness source** clearly in code
5. **Consider economic incentives** for manipulation
6. **Test with attacker contracts** during development

### ❌ DON'T:
1. **Never use block.timestamp alone** for randomness
2. **Never use block.number alone** for randomness
3. **Never use msg.sender** for randomness
4. **Don't combine weak sources** and think it's secure
5. **Don't use blockhash of current block**
6. **Don't assume miners won't manipulate** for profit

## Testing

### Test Cases
```javascript
describe("Randomness Security Tests", function() {
    it("Should not allow prediction of lottery outcome", async function() {
        // Try to predict outcome
        const predictedRandom = calculateRandom(block.timestamp);
        
        // Should not be able to predict
        expect(predictedRandom).to.not.be.predictable;
    });
    
    it("Should prevent attacker from guaranteed wins", async function() {
        // Attacker tries to predict and win
        const attackerWins = await attacker.tryToWin();
        
        // Should have normal probability, not 100%
        expect(attackerWins).to.be.lessThan(100);  // Not guaranteed
    });
});
```

## Prevention Checklist

- [ ] Are you using Chainlink VRF for critical randomness?
- [ ] If not VRF, is commit-reveal properly implemented?
- [ ] Is there a delay between randomness request and usage?
- [ ] Are block variables (timestamp, number, hash) avoided?
- [ ] Is msg.sender excluded from randomness calculation?
- [ ] Have you tested with an attacker contract?
- [ ] Is the randomness verifiable by users?
- [ ] Are there economic disincentives for manipulation?
- [ ] Is the two-step process (request/fulfill) implemented?
- [ ] Have you considered miner/validator manipulation incentives?

## References

### Academic Papers
1. "Researching Deterministic Bitcoin Address Generation in Smart Contracts" - ACM, 2018
2. "SoK: Unraveling Bitcoin Smart Contracts" - IEEE S&P, 2018
3. "On the Difficulty of Hiding the Balance of Lightning Network Channels" - ACNS, 2020

### Vulnerability Databases
- [SWC-120: Weak Sources of Randomness from Chain Attributes](https://swcregistry.io/docs/SWC-120)
- [DASP Top 10: Bad Randomness](https://dasp.co/#item-6)

### Tools & Resources
- [Chainlink VRF Documentation](https://docs.chain.link/vrf/v2/introduction)
- [Commit-Reveal Schemes](https://ethereum.stackexchange.com/questions/191/how-can-i-securely-generate-a-random-number-in-my-smart-contract)
- [OpenZeppelin Forum: Randomness](https://forum.openzeppelin.com/t/secure-random-numbers-in-solidity/386)

### Historical Incidents
- [SmartBillions Exploit](https://medium.com/@peckshield/smartbillions-exploit-analysis-d14099d4f424)
- [Fomo3D Analysis](https://medium.com/coinmonks/how-the-winner-got-fomo3d-prize-a-detailed-explanation-b30a69b7813f)

## Conclusion

Insecure randomness is one of the most exploited vulnerabilities in smart contracts, especially in gaming and NFT applications. The deterministic nature of blockchain makes true randomness challenging, but solutions like Chainlink VRF provide secure, verifiable randomness.

**Key Takeaways**:
1. **Never use block variables alone** for randomness
2. **Chainlink VRF is the gold standard** for secure randomness
3. **Commit-reveal schemes** work for simpler cases
4. **Always test** with attacker contracts
5. **Economic incentives matter** - even small amounts can incentivize manipulation

The cost of implementing secure randomness (via VRF or commit-reveal) is minimal compared to potential losses from exploitation. For any application involving financial value or user fairness, proper randomness is not optional—it's essential.

---

**Last Updated**: 2025  
**Severity**: CRITICAL  
**OWASP Category**: A02:2021 – Cryptographic Failures
