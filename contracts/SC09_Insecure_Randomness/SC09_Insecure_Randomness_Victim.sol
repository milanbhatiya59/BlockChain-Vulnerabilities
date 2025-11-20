// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
 SC09_Insecure_Randomness_Victim.sol
 Purpose: Demonstrates Insecure Randomness vulnerabilities in smart contracts.
 
 Vulnerabilities:
 - Using block.timestamp for randomness (predictable)
 - Using block.number for randomness (predictable by miners)
 - Using blockhash for randomness (manipulatable)
 - Using msg.sender/tx.origin for randomness (predictable)
 - Combining weak entropy sources (still weak)
*/

contract InsecureRandomnessVictim {
    address public owner;
    uint256 public jackpot;
    uint256 public lastWinner;
    address public lastWinnerAddress;
    
    event LotteryEntered(address indexed player, uint256 ticketNumber);
    event Winner(address indexed player, uint256 amount, uint256 randomNumber);
    event GameResult(address indexed player, bool won, uint256 randomNumber);
    
    constructor() payable {
        owner = msg.sender;
        jackpot = msg.value;
    }
    
    // ❌ VULNERABILITY 1: Using block.timestamp for randomness
    // Miners can manipulate timestamp within ~15 seconds
    function playLotteryTimestamp() external payable {
        require(msg.value >= 0.1 ether, "Minimum bet is 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: block.timestamp is predictable and manipulatable
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp))) % 100;
        
        emit LotteryEntered(msg.sender, random);
        
        // Win if random < 10 (10% chance)
        if (random < 10) {
            uint256 prize = jackpot;
            jackpot = 0;
            lastWinner = random;
            lastWinnerAddress = msg.sender;
            
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize, random);
        }
    }
    
    // ❌ VULNERABILITY 2: Using block.number for randomness
    // Block number is predictable
    function playLotteryBlockNumber() external payable {
        require(msg.value >= 0.1 ether, "Minimum bet is 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: block.number is predictable
        uint256 random = uint256(keccak256(abi.encodePacked(block.number))) % 100;
        
        emit LotteryEntered(msg.sender, random);
        
        if (random < 10) {
            uint256 prize = jackpot;
            jackpot = 0;
            lastWinner = random;
            lastWinnerAddress = msg.sender;
            
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize, random);
        }
    }
    
    // ❌ VULNERABILITY 3: Using blockhash for randomness
    // Blockhash of recent blocks can be known, future blocks can be influenced
    function playLotteryBlockhash() external payable {
        require(msg.value >= 0.1 ether, "Minimum bet is 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: blockhash is predictable for past blocks
        uint256 random = uint256(blockhash(block.number - 1)) % 100;
        
        emit LotteryEntered(msg.sender, random);
        
        if (random < 10) {
            uint256 prize = jackpot;
            jackpot = 0;
            lastWinner = random;
            lastWinnerAddress = msg.sender;
            
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize, random);
        }
    }
    
    // ❌ VULNERABILITY 4: Using msg.sender for randomness
    // Attacker can compute this before calling
    function playLotterySender() external payable {
        require(msg.value >= 0.1 ether, "Minimum bet is 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: msg.sender is known to the attacker
        uint256 random = uint256(keccak256(abi.encodePacked(msg.sender))) % 100;
        
        emit LotteryEntered(msg.sender, random);
        
        if (random < 10) {
            uint256 prize = jackpot;
            jackpot = 0;
            lastWinner = random;
            lastWinnerAddress = msg.sender;
            
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize, random);
        }
    }
    
    // ❌ VULNERABILITY 5: Combining weak entropy sources (still weak!)
    // Multiple predictable values don't create unpredictable randomness
    function playLotteryCombined() external payable {
        require(msg.value >= 0.1 ether, "Minimum bet is 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: Combining weak sources is still weak
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            msg.sender
        ))) % 100;
        
        emit LotteryEntered(msg.sender, random);
        
        if (random < 10) {
            uint256 prize = jackpot;
            jackpot = 0;
            lastWinner = random;
            lastWinnerAddress = msg.sender;
            
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize, random);
        }
    }
    
    // ❌ VULNERABILITY 6: Using block.difficulty (now prevrandao)
    // Can be influenced by miners/validators
    function playLotteryDifficulty() external payable {
        require(msg.value >= 0.1 ether, "Minimum bet is 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: block.difficulty (prevrandao in PoS) is manipulatable
        uint256 random = uint256(keccak256(abi.encodePacked(block.prevrandao))) % 100;
        
        emit LotteryEntered(msg.sender, random);
        
        if (random < 10) {
            uint256 prize = jackpot;
            jackpot = 0;
            lastWinner = random;
            lastWinnerAddress = msg.sender;
            
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize, random);
        }
    }
    
    // Helper function to fund the contract
    function fundJackpot() external payable {
        jackpot += msg.value;
    }
    
    // Helper functions
    function getJackpot() external view returns (uint256) {
        return jackpot;
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {
        jackpot += msg.value;
    }
}

// Vulnerable NFT Mint with insecure randomness
contract VulnerableNFTMint {
    address public owner;
    uint256 public nextTokenId;
    uint256 public constant TOTAL_RARE = 10;
    uint256 public constant TOTAL_COMMON = 990;
    uint256 public raresMinted;
    
    mapping(uint256 => address) public tokenOwner;
    mapping(uint256 => bool) public isRare;
    
    event NFTMinted(address indexed minter, uint256 tokenId, bool rare);
    
    constructor() {
        owner = msg.sender;
        nextTokenId = 1;
    }
    
    // ❌ VULNERABILITY: Predictable rarity determination
    function mintNFT() external payable {
        require(msg.value >= 0.01 ether, "Minting costs 0.01 ETH");
        require(nextTokenId <= 1000, "All NFTs minted");
        
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        
        // VULNERABLE: Predictable randomness for rarity
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            tokenId
        ))) % 100;
        
        bool rare = false;
        
        // 1% chance for rare (if random == 0)
        if (random == 0 && raresMinted < TOTAL_RARE) {
            rare = true;
            raresMinted++;
        }
        
        tokenOwner[tokenId] = msg.sender;
        isRare[tokenId] = rare;
        
        emit NFTMinted(msg.sender, tokenId, rare);
    }
    
    // ❌ VULNERABILITY: Predictable winner selection
    function selectRandomWinner(address[] memory participants) external view returns (address) {
        require(participants.length > 0, "No participants");
        
        // VULNERABLE: Anyone can predict the winner
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.number
        ))) % participants.length;
        
        return participants[random];
    }
    
    function getTokenInfo(uint256 tokenId) external view returns (address tokenOwner_, bool rare) {
        return (tokenOwner[tokenId], isRare[tokenId]);
    }
}

// Vulnerable coin flip game
contract VulnerableCoinFlip {
    uint256 public consecutiveWins;
    address public champion;
    uint256 public lastBlockNumber;
    
    event FlipResult(address indexed player, bool guess, bool result, bool won);
    event NewChampion(address indexed player, uint256 consecutiveWins);
    
    // ❌ VULNERABILITY: Predictable coin flip using blockhash
    function flip(bool guess) external returns (bool) {
        // Prevent same block manipulation
        require(block.number != lastBlockNumber, "Wait for next block");
        lastBlockNumber = block.number;
        
        // VULNERABLE: blockhash is predictable
        uint256 blockValue = uint256(blockhash(block.number - 1));
        uint256 coinFlip = blockValue % 2;
        bool result = (coinFlip == 1);
        
        bool won = (guess == result);
        
        if (won) {
            consecutiveWins++;
            
            if (consecutiveWins >= 10) {
                champion = msg.sender;
                emit NewChampion(msg.sender, consecutiveWins);
            }
        } else {
            consecutiveWins = 0;
        }
        
        emit FlipResult(msg.sender, guess, result, won);
        
        return won;
    }
    
    function getConsecutiveWins() external view returns (uint256) {
        return consecutiveWins;
    }
}
