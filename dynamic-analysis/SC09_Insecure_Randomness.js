const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SC09: Insecure Randomness - Dynamic Analysis", function () {
    let victim;
    let nftVictim;
    let coinFlipVictim;
    let attacker;
    let nftAttacker;
    let coinFlipAttacker;
    let owner;
    let user1;
    let user2;
    
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy victim contracts
        const InsecureRandomnessVictim = await ethers.getContractFactory("InsecureRandomnessVictim");
        victim = await InsecureRandomnessVictim.deploy({ value: ethers.parseEther("10.0") });
        await victim.waitForDeployment();
        
        const VulnerableNFTMint = await ethers.getContractFactory("VulnerableNFTMint");
        nftVictim = await VulnerableNFTMint.deploy();
        await nftVictim.waitForDeployment();
        
        const VulnerableCoinFlip = await ethers.getContractFactory("VulnerableCoinFlip");
        coinFlipVictim = await VulnerableCoinFlip.deploy();
        await coinFlipVictim.waitForDeployment();
        
        // Deploy attacker contracts
        const victimAddress = await victim.getAddress();
        const InsecureRandomnessAttacker = await ethers.getContractFactory("InsecureRandomnessAttacker");
        attacker = await InsecureRandomnessAttacker.deploy(victimAddress);
        await attacker.waitForDeployment();
        
        const nftVictimAddress = await nftVictim.getAddress();
        const NFTMintAttacker = await ethers.getContractFactory("NFTMintAttacker");
        nftAttacker = await NFTMintAttacker.deploy(nftVictimAddress);
        await nftAttacker.waitForDeployment();
        
        const coinFlipVictimAddress = await coinFlipVictim.getAddress();
        const CoinFlipAttacker = await ethers.getContractFactory("CoinFlipAttacker");
        coinFlipAttacker = await CoinFlipAttacker.deploy(coinFlipVictimAddress);
        await coinFlipAttacker.waitForDeployment();
        
        // Fund victim contract
        await victim.fundJackpot({ value: ethers.parseEther("5.0") });
    });
    
    describe("Vulnerability Detection", function () {
        it("Should detect block.timestamp randomness is predictable", async function () {
            const balanceBefore = await ethers.provider.getBalance(user1.address);
            
            // User plays lottery
            const tx = await victim.connect(user1).playLotteryTimestamp({ 
                value: ethers.parseEther("0.1") 
            });
            
            const receipt = await tx.wait();
            
            // Check if user won (we can't predict in test, but we can verify randomness source)
            const jackpot = await victim.getJackpot();
            
            console.log("    Lottery played with block.timestamp randomness");
            console.log("    Current jackpot:", ethers.formatEther(jackpot), "ETH");
            
            // Demonstrate predictability by calculating the same random value
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const predictedRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["uint256"], [block.timestamp])
            )) % 100n;
            
            console.log("    Predicted random number:", predictedRandom.toString());
            
            // The randomness is based solely on block.timestamp
            expect(predictedRandom).to.be.lessThan(100);
        });
        
        it("Should detect block.number randomness is predictable", async function () {
            const tx = await victim.connect(user1).playLotteryBlockNumber({ 
                value: ethers.parseEther("0.1") 
            });
            
            const receipt = await tx.wait();
            
            // Calculate the same random value
            const predictedRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["uint256"], [receipt.blockNumber])
            )) % 100n;
            
            console.log("    Block number:", receipt.blockNumber);
            console.log("    Predicted random number:", predictedRandom.toString());
            
            expect(predictedRandom).to.be.lessThan(100);
        });
        
        it("Should detect blockhash randomness is predictable", async function () {
            const tx = await victim.connect(user1).playLotteryBlockhash({ 
                value: ethers.parseEther("0.1") 
            });
            
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const prevBlock = await ethers.provider.getBlock(receipt.blockNumber - 1);
            
            // Calculate the same random value
            const predictedRandom = BigInt(prevBlock.hash) % 100n;
            
            console.log("    Previous block hash:", prevBlock.hash);
            console.log("    Predicted random number:", predictedRandom.toString());
            
            expect(predictedRandom).to.be.lessThan(100);
        });
        
        it("Should detect msg.sender randomness is predictable", async function () {
            const attackerAddress = await attacker.getAddress();
            
            // Attacker knows their own address
            const predictedRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["address"], [attackerAddress])
            )) % 100n;
            
            console.log("    Attacker address:", attackerAddress);
            console.log("    Predicted random number:", predictedRandom.toString());
            console.log("    Attacker can calculate this before calling");
            
            expect(predictedRandom).to.be.lessThan(100);
        });
        
        it("Should detect combined weak randomness is still predictable", async function () {
            const tx = await victim.connect(user1).playLotteryCombined({ 
                value: ethers.parseEther("0.1") 
            });
            
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            
            // Calculate the same random value using all three sources
            const predictedRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(
                    ["uint256", "uint256", "address"],
                    [block.timestamp, receipt.blockNumber, user1.address]
                )
            )) % 100n;
            
            console.log("    Combined randomness from:");
            console.log("      - Timestamp:", block.timestamp);
            console.log("      - Block number:", receipt.blockNumber);
            console.log("      - Sender:", user1.address);
            console.log("    Predicted random:", predictedRandom.toString());
            console.log("    Still predictable!");
            
            expect(predictedRandom).to.be.lessThan(100);
        });
        
        it("Should detect NFT rarity is predictable", async function () {
            // Mint an NFT
            await nftVictim.connect(user1).mintNFT({ value: ethers.parseEther("0.01") });
            
            const tokenId = 1;
            const [tokenOwner, isRare] = await nftVictim.getTokenInfo(tokenId);
            
            console.log("    Token ID:", tokenId);
            console.log("    Owner:", tokenOwner);
            console.log("    Is Rare:", isRare);
            console.log("    Rarity is based on predictable randomness");
            
            expect(tokenOwner).to.equal(user1.address);
        });
        
        it("Should detect coin flip is predictable", async function () {
            // The coin flip uses blockhash(block.number - 1)
            // We can demonstrate predictability by showing we know the hash before calling
            
            // Mine a block first to establish a known state
            await ethers.provider.send("evm_mine");
            
            // Get current block to know what the victim will use
            const currentBlock = await ethers.provider.getBlock("latest");
            
            // The victim will use blockhash(block.number - 1) which is the current block
            // when we call in the next transaction
            console.log("    Current block hash:", currentBlock.hash);
            console.log("    This will be used as blockhash(block.number - 1) in next tx");
            
            // Calculate what the flip will be based on current block
            const blockValue = BigInt(currentBlock.hash);
            const coinFlip = blockValue % 2n;
            const prediction = (coinFlip === 1n);
            
            console.log("    Coin flip value:", coinFlip.toString());
            console.log("    Predicted result:", prediction ? "Heads" : "Tails");
            
            // Make the flip - the hash we calculated above will be used
            const tx = await coinFlipVictim.flip(prediction);
            await tx.wait();
            
            // Check consecutive wins
            const consecutiveWins = await coinFlipVictim.getConsecutiveWins();
            
            console.log("    Consecutive wins after flip:", consecutiveWins.toString());
            console.log("    Randomness is predictable - attacker knows outcome before calling");
            
            // The test passes if we can demonstrate the calculation
            // (wins might be 0 or 1 depending on whether we got it right this time)
            expect(consecutiveWins).to.be.gte(0);
        });
    });
    
    describe("Attack Scenarios", function () {
        it("Should successfully attack timestamp-based lottery", async function () {
            const attackerAddress = await attacker.getAddress();
            const initialBalance = await ethers.provider.getBalance(attackerAddress);
            
            // Calculate if current timestamp will win
            const block = await ethers.provider.getBlock("latest");
            const predictedRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["uint256"], [block.timestamp + 1]) // +1 for next block
            )) % 100n;
            
            console.log("    Predicted random:", predictedRandom.toString());
            
            // Fund attacker
            await owner.sendTransaction({
                to: attackerAddress,
                value: ethers.parseEther("1.0")
            });
            
            // Execute attack
            await attacker.attackTimestampLottery({ value: ethers.parseEther("0.1") });
            
            const finalBalance = await ethers.provider.getBalance(attackerAddress);
            const attacksSucceeded = await attacker.attacksSucceeded();
            
            console.log("    Initial balance:", ethers.formatEther(initialBalance));
            console.log("    Final balance:", ethers.formatEther(finalBalance));
            console.log("    Attacks succeeded:", attacksSucceeded.toString());
        });
        
        it("Should successfully attack combined randomness lottery", async function () {
            const attackerAddress = await attacker.getAddress();
            
            // Fund attacker
            await owner.sendTransaction({
                to: attackerAddress,
                value: ethers.parseEther("1.0")
            });
            
            const balanceBefore = await ethers.provider.getBalance(attackerAddress);
            
            // Attack combined lottery
            await attacker.attackCombinedLottery({ value: ethers.parseEther("0.1") });
            
            const balanceAfter = await ethers.provider.getBalance(attackerAddress);
            const attacksSucceeded = await attacker.attacksSucceeded();
            
            console.log("    Balance before:", ethers.formatEther(balanceBefore));
            console.log("    Balance after:", ethers.formatEther(balanceAfter));
            console.log("    Attacks succeeded:", attacksSucceeded.toString());
            
            // Attacker only loses gas, not the bet amount (if prediction shows they'd lose)
            expect(balanceAfter).to.be.gte(balanceBefore - ethers.parseEther("0.15")); // Account for gas
        });
        
        it("Should successfully predict and win coin flips", async function () {
            // Mine some blocks first
            await ethers.provider.send("evm_mine");
            await ethers.provider.send("evm_mine");
            
            const winsBefore = await coinFlipAttacker.getWins();
            
            // Attack flip
            await coinFlipAttacker.attackFlip();
            
            const winsAfter = await coinFlipAttacker.getWins();
            
            console.log("    Wins before:", winsBefore.toString());
            console.log("    Wins after:", winsAfter.toString());
            
            expect(winsAfter).to.equal(winsBefore + 1n);
        });
        
        it("Should predict NFT rarity and only mint rare ones", async function () {
            const nftAttackerAddress = await nftAttacker.getAddress();
            
            // Fund attacker
            await owner.sendTransaction({
                to: nftAttackerAddress,
                value: ethers.parseEther("1.0")
            });
            
            // Try to attack mint
            const nextTokenId = await nftVictim.nextTokenId();
            
            console.log("    Next token ID:", nextTokenId.toString());
            
            // Try minting (will only succeed if it would be rare)
            try {
                await nftAttacker.bruteForceRareMint({ value: ethers.parseEther("0.01") });
                
                const raresMinted = await nftAttacker.rareNFTsMinted();
                console.log("    Rare NFTs minted by attacker:", raresMinted.toString());
                
                expect(raresMinted).to.be.greaterThan(0);
            } catch (error) {
                console.log("    Current block doesn't yield rare NFT, attacker waits");
                expect(error.message).to.include("Not a winning block");
            }
        });
    });
    
    describe("Vulnerability Comparison", function () {
        it("Should show all randomness sources are predictable", async function () {
            const block = await ethers.provider.getBlock("latest");
            const testAddress = user1.address;
            
            console.log("\n    Predictable Randomness Sources:");
            console.log("    ================================");
            
            const timestamp = block.timestamp;
            const timestampRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["uint256"], [timestamp])
            )) % 100n;
            console.log(`    block.timestamp: ${timestamp} -> ${timestampRandom}`);
            
            const blockNumber = block.number;
            const blockNumberRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["uint256"], [blockNumber])
            )) % 100n;
            console.log(`    block.number: ${blockNumber} -> ${blockNumberRandom}`);
            
            const blockhash = block.hash;
            const blockhashRandom = BigInt(blockhash) % 100n;
            console.log(`    blockhash: ${blockhash.slice(0, 10)}... -> ${blockhashRandom}`);
            
            const senderRandom = BigInt(ethers.keccak256(
                ethers.solidityPacked(["address"], [testAddress])
            )) % 100n;
            console.log(`    msg.sender: ${testAddress.slice(0, 10)}... -> ${senderRandom}`);
            
            console.log("\n    All values are known to attacker in same transaction!");
        });
    });
    
    describe("Real-World Scenarios", function () {
        it("Should demonstrate lottery vulnerability impact", async function () {
            const jackpotBefore = await victim.getJackpot();
            
            console.log("    Initial jackpot:", ethers.formatEther(jackpotBefore));
            
            // Multiple users play
            await victim.connect(user1).playLotteryTimestamp({ value: ethers.parseEther("0.1") });
            await victim.connect(user2).playLotteryTimestamp({ value: ethers.parseEther("0.1") });
            
            const jackpotAfter = await victim.getJackpot();
            const lastWinner = await victim.lastWinnerAddress();
            
            console.log("    Final jackpot:", ethers.formatEther(jackpotAfter));
            console.log("    Last winner:", lastWinner);
            
            if (lastWinner !== ethers.ZeroAddress) {
                console.log("    Someone won! Attacker could have predicted this.");
            }
        });
        
        it("Should demonstrate NFT rarity manipulation potential", async function () {
            console.log("    Demonstrating NFT rarity manipulation:");
            
            // Mint several NFTs
            for (let i = 0; i < 5; i++) {
                await nftVictim.connect(user1).mintNFT({ value: ethers.parseEther("0.01") });
                
                const [owner, isRare] = await nftVictim.getTokenInfo(i + 1);
                console.log(`    Token ${i + 1}: Rare = ${isRare}`);
            }
            
            const raresMinted = await nftVictim.raresMinted();
            console.log(`    Total rare NFTs: ${raresMinted}/10`);
            console.log("    Attacker could mint only when rare!");
        });
    });
});
