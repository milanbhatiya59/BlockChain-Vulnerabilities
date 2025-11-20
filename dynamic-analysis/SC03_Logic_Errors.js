const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("SC03: Logic Errors - Unfair Distribution Exploit", function () {
  let deployer, attacker, user;

  before(async function () {
    [deployer, attacker, user] = await ethers.getSigners();

    // Deploy the vulnerable contract
    const UnfairDistribution = await ethers.getContractFactory("UnfairDistribution", deployer);
    this.vulnerableContract = await UnfairDistribution.deploy();

    // User contributes 10 ETH
    await this.vulnerableContract.connect(user).contribute({ value: ethers.parseEther("10") });
  });

  it("should allow an attacker to claim tokens without contributing", async function () {
    // Attacker deploys the exploit contract
    const LogicErrorExploiter = await ethers.getContractFactory("LogicErrorExploiter", attacker);
    const vulnerableContractAddress = await this.vulnerableContract.getAddress();
    this.exploiterContract = await LogicErrorExploiter.deploy(vulnerableContractAddress);

    // Attacker calls the attack function
    await this.exploiterContract.attack();

    // Check if the attacker contract has claimed tokens (exploiting the logic error)
    const exploiterAddress = await this.exploiterContract.getAddress();
    const hasClaimed = await this.vulnerableContract.claimed(exploiterAddress);
    expect(hasClaimed).to.be.true;
  });

  it("should not allow a legitimate user to be affected by the attack", async function () {
    // Legitimate user tries to claim their tokens
    await this.vulnerableContract.connect(user).claim();

    // Check if the user has claimed their tokens
    const hasClaimed = await this.vulnerableContract.claimed(user.address);
    expect(hasClaimed).to.be.true;
  });
});
