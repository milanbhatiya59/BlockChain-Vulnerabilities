const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");
  console.log("=".repeat(60));

  // ===== SC01: Access Control Vulnerabilities =====
  console.log("\n[SC01] Deploying Access Control Vulnerability Demo...");

  // Deploy VulnerableWallet
  const VulnerableWallet = await ethers.getContractFactory("VulnerableWallet");
  const vulnerableWallet = await VulnerableWallet.deploy();
  await vulnerableWallet.waitForDeployment();
  const walletAddress = await vulnerableWallet.getAddress();
  console.log(`✓ VulnerableWallet deployed to: ${walletAddress}`);

  // Deploy AccessControlAttacker
  const AccessControlAttacker = await ethers.getContractFactory(
    "AccessControlAttacker"
  );
  const accessAttacker = await AccessControlAttacker.deploy(walletAddress);
  await accessAttacker.waitForDeployment();
  const accessAttackerAddress = await accessAttacker.getAddress();
  console.log(`✓ AccessControlAttacker deployed to: ${accessAttackerAddress}`);

  console.log("-".repeat(60));

  // ===== SC02: Price Oracle Manipulation =====
  console.log("\n[SC02] Deploying Price Oracle Manipulation Demo...");

  // Deploy VulnerableDEX with 100 ETH initial liquidity
  const VulnerableDEX = await ethers.getContractFactory("VulnerableDEX");
  const vulnerableDEX = await VulnerableDEX.deploy({
    value: ethers.parseEther("100.0"),
  });
  await vulnerableDEX.waitForDeployment();
  const dexAddress = await vulnerableDEX.getAddress();
  console.log(`✓ VulnerableDEX deployed to: ${dexAddress}`);

  // Deploy PriceManipulationAttacker
  const PriceManipulationAttacker = await ethers.getContractFactory(
    "PriceManipulationAttacker"
  );
  const priceAttacker = await PriceManipulationAttacker.deploy(dexAddress);
  await priceAttacker.waitForDeployment();
  const priceAttackerAddress = await priceAttacker.getAddress();
  console.log(
    `✓ PriceManipulationAttacker deployed to: ${priceAttackerAddress}`
  );

  console.log("-".repeat(60));

  // ===== SC03: Logic Errors =====
  console.log("\n[SC03] Deploying Logic Error Vulnerability Demo...");

  // Deploy UnfairDistribution
  const UnfairDistribution = await ethers.getContractFactory(
    "UnfairDistribution"
  );
  const unfairDistribution = await UnfairDistribution.deploy();
  await unfairDistribution.waitForDeployment();
  const unfairDistributionAddress = await unfairDistribution.getAddress();
  console.log(`✓ UnfairDistribution deployed to: ${unfairDistributionAddress}`);

  // Deploy LogicErrorExploiter
  const LogicErrorExploiter = await ethers.getContractFactory(
    "LogicErrorExploiter"
  );
  const logicErrorExploiter = await LogicErrorExploiter.deploy(
    unfairDistributionAddress
  );
  await logicErrorExploiter.waitForDeployment();
  const logicErrorExploiterAddress = await logicErrorExploiter.getAddress();
  console.log(
    `✓ LogicErrorExploiter deployed to: ${logicErrorExploiterAddress}`
  );

  console.log("-".repeat(60));

  // ===== SC04: Lack of Input Validation =====
  console.log("\n[SC04] Deploying Input Validation Vulnerability Demo...");

  // Deploy TokenSale
  const TokenSale = await ethers.getContractFactory("TokenSale");
  const tokenSale = await TokenSale.deploy();
  await tokenSale.waitForDeployment();
  const tokenSaleAddress = await tokenSale.getAddress();
  console.log(`✓ TokenSale deployed to: ${tokenSaleAddress}`);

  // Deploy InputValidationExploiter
  const InputValidationExploiter = await ethers.getContractFactory(
    "InputValidationExploiter"
  );
  const inputValidationExploiter = await InputValidationExploiter.deploy(
    tokenSaleAddress
  );
  await inputValidationExploiter.waitForDeployment();
  const inputValidationExploiterAddress =
    await inputValidationExploiter.getAddress();
  console.log(
    `✓ InputValidationExploiter deployed to: ${inputValidationExploiterAddress}`
  );

  console.log("-".repeat(60));

  // ===== SC05: Reentrancy Attack =====
  console.log("\n[SC05] Deploying Reentrancy Vulnerability Demo...");

  // Deploy VulnerableBank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.waitForDeployment();
  const bankAddress = await vulnerableBank.getAddress();
  console.log(`✓ VulnerableBank deployed to: ${bankAddress}`);

  // Deploy Attacker, passing the bank's address to its constructor
  const Attacker = await ethers.getContractFactory("Attacker");
  const attackerContract = await Attacker.deploy(bankAddress);
  await attackerContract.waitForDeployment();
  const attackerAddress = await attackerContract.getAddress();
  console.log(`✓ Attacker contract deployed to: ${attackerAddress}`);

  console.log("-".repeat(60));

  // ===== SC06: Unchecked External Calls =====
  console.log(
    "\n[SC06] Deploying Unchecked External Calls Vulnerability Demo..."
  );

  // Deploy PaymentProcessor
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy();
  await paymentProcessor.waitForDeployment();
  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log(`✓ PaymentProcessor deployed to: ${paymentProcessorAddress}`);

  // Deploy UncheckedCallExploiter
  const UncheckedCallExploiter = await ethers.getContractFactory(
    "UncheckedCallExploiter"
  );
  const uncheckedCallExploiter = await UncheckedCallExploiter.deploy(
    paymentProcessorAddress
  );
  await uncheckedCallExploiter.waitForDeployment();
  const uncheckedCallExploiterAddress =
    await uncheckedCallExploiter.getAddress();
  console.log(
    `✓ UncheckedCallExploiter deployed to: ${uncheckedCallExploiterAddress}`
  );

  console.log("-".repeat(60));

  // ===== SC07: Flash Loan Attacks =====
  console.log("\n[SC07] Deploying Flash Loan Attack Vulnerability Demo...");

  // Deploy SimpleFlashLoanProvider with 100 ETH initial liquidity
  const SimpleFlashLoanProvider = await ethers.getContractFactory(
    "SimpleFlashLoanProvider"
  );
  const flashLoanProvider = await SimpleFlashLoanProvider.deploy({
    value: ethers.parseEther("100.0"),
  });
  await flashLoanProvider.waitForDeployment();
  const flashLoanProviderAddress = await flashLoanProvider.getAddress();
  console.log(
    `✓ SimpleFlashLoanProvider deployed to: ${flashLoanProviderAddress}`
  );

  // Deploy VulnerableGovernance with 50 ETH treasury
  const VulnerableGovernance = await ethers.getContractFactory(
    "VulnerableGovernance"
  );
  const vulnerableGovernance = await VulnerableGovernance.deploy({
    value: ethers.parseEther("50.0"),
  });
  await vulnerableGovernance.waitForDeployment();
  const vulnerableGovernanceAddress = await vulnerableGovernance.getAddress();
  console.log(
    `✓ VulnerableGovernance deployed to: ${vulnerableGovernanceAddress}`
  );

  // Deploy VulnerablePriceOracle with 100 ETH
  const VulnerablePriceOracle = await ethers.getContractFactory(
    "VulnerablePriceOracle"
  );
  const vulnerablePriceOracle = await VulnerablePriceOracle.deploy({
    value: ethers.parseEther("100.0"),
  });
  await vulnerablePriceOracle.waitForDeployment();
  const vulnerablePriceOracleAddress = await vulnerablePriceOracle.getAddress();
  console.log(
    `✓ VulnerablePriceOracle deployed to: ${vulnerablePriceOracleAddress}`
  );

  // Deploy GovernanceAttacker
  const GovernanceAttacker = await ethers.getContractFactory(
    "GovernanceAttacker"
  );
  const governanceAttacker = await GovernanceAttacker.deploy(
    flashLoanProviderAddress,
    vulnerableGovernanceAddress
  );
  await governanceAttacker.waitForDeployment();
  const governanceAttackerAddress = await governanceAttacker.getAddress();
  console.log(`✓ GovernanceAttacker deployed to: ${governanceAttackerAddress}`);

  // Deploy PriceManipulationFlashAttacker
  const PriceManipulationFlashAttacker = await ethers.getContractFactory(
    "contracts/SC07_Flash_Loan_Attacks/SC07_Flash_Loan_Attacks_Attacker.sol:PriceManipulationFlashAttacker"
  );
  const priceManipulationFlashAttacker =
    await PriceManipulationFlashAttacker.deploy(
      flashLoanProviderAddress,
      vulnerablePriceOracleAddress
    );
  await priceManipulationFlashAttacker.waitForDeployment();
  const priceManipulationFlashAttackerAddress =
    await priceManipulationFlashAttacker.getAddress();
  console.log(
    `✓ PriceManipulationFlashAttacker deployed to: ${priceManipulationFlashAttackerAddress}`
  );

  console.log("-".repeat(60));

  // ===== SC08: Integer Overflow and Underflow =====
  console.log(
    "\n[SC08] Deploying Integer Overflow and Underflow Vulnerability Demo..."
  );

  // Deploy IntegerOverflowVictim
  const IntegerOverflowVictim = await ethers.getContractFactory(
    "IntegerOverflowVictim"
  );
  const integerOverflowVictim = await IntegerOverflowVictim.deploy();
  await integerOverflowVictim.waitForDeployment();
  const integerOverflowVictimAddress = await integerOverflowVictim.getAddress();
  console.log(
    `✓ IntegerOverflowVictim deployed to: ${integerOverflowVictimAddress}`
  );

  // Deploy TimeLockVictim
  const TimeLockVictim = await ethers.getContractFactory("TimeLockVictim");
  const timeLockVictim = await TimeLockVictim.deploy();
  await timeLockVictim.waitForDeployment();
  const timeLockVictimAddress = await timeLockVictim.getAddress();
  console.log(`✓ TimeLockVictim deployed to: ${timeLockVictimAddress}`);

  // Deploy IntegerOverflowAttacker
  const IntegerOverflowAttacker = await ethers.getContractFactory(
    "IntegerOverflowAttacker"
  );
  const integerOverflowAttacker = await IntegerOverflowAttacker.deploy(
    integerOverflowVictimAddress
  );
  await integerOverflowAttacker.waitForDeployment();
  const integerOverflowAttackerAddress =
    await integerOverflowAttacker.getAddress();
  console.log(
    `✓ IntegerOverflowAttacker deployed to: ${integerOverflowAttackerAddress}`
  );

  // Deploy TimeLockAttacker
  const TimeLockAttacker = await ethers.getContractFactory("TimeLockAttacker");
  const timeLockAttacker = await TimeLockAttacker.deploy(timeLockVictimAddress);
  await timeLockAttacker.waitForDeployment();
  const timeLockAttackerAddress = await timeLockAttacker.getAddress();
  console.log(`✓ TimeLockAttacker deployed to: ${timeLockAttackerAddress}`);

  console.log("-".repeat(60));

  // ===== SC09: Insecure Randomness =====
  console.log("\n[SC09] Deploying Insecure Randomness Vulnerability Demo...");

  // Deploy InsecureRandomnessVictim with 10 ETH initial jackpot
  const InsecureRandomnessVictim = await ethers.getContractFactory(
    "InsecureRandomnessVictim"
  );
  const insecureRandomnessVictim = await InsecureRandomnessVictim.deploy({
    value: ethers.parseEther("10.0"),
  });
  await insecureRandomnessVictim.waitForDeployment();
  const insecureRandomnessVictimAddress =
    await insecureRandomnessVictim.getAddress();
  console.log(
    `✓ InsecureRandomnessVictim deployed to: ${insecureRandomnessVictimAddress}`
  );

  // Deploy VulnerableNFTMint
  const VulnerableNFTMint = await ethers.getContractFactory(
    "VulnerableNFTMint"
  );
  const vulnerableNFTMint = await VulnerableNFTMint.deploy();
  await vulnerableNFTMint.waitForDeployment();
  const vulnerableNFTMintAddress = await vulnerableNFTMint.getAddress();
  console.log(`✓ VulnerableNFTMint deployed to: ${vulnerableNFTMintAddress}`);

  // Deploy VulnerableCoinFlip
  const VulnerableCoinFlip = await ethers.getContractFactory(
    "VulnerableCoinFlip"
  );
  const vulnerableCoinFlip = await VulnerableCoinFlip.deploy();
  await vulnerableCoinFlip.waitForDeployment();
  const vulnerableCoinFlipAddress = await vulnerableCoinFlip.getAddress();
  console.log(`✓ VulnerableCoinFlip deployed to: ${vulnerableCoinFlipAddress}`);

  // Deploy InsecureRandomnessAttacker
  const InsecureRandomnessAttacker = await ethers.getContractFactory(
    "InsecureRandomnessAttacker"
  );
  const insecureRandomnessAttacker = await InsecureRandomnessAttacker.deploy(
    insecureRandomnessVictimAddress
  );
  await insecureRandomnessAttacker.waitForDeployment();
  const insecureRandomnessAttackerAddress =
    await insecureRandomnessAttacker.getAddress();
  console.log(
    `✓ InsecureRandomnessAttacker deployed to: ${insecureRandomnessAttackerAddress}`
  );

  // Deploy NFTMintAttacker
  const NFTMintAttacker = await ethers.getContractFactory("NFTMintAttacker");
  const nftMintAttacker = await NFTMintAttacker.deploy(
    vulnerableNFTMintAddress
  );
  await nftMintAttacker.waitForDeployment();
  const nftMintAttackerAddress = await nftMintAttacker.getAddress();
  console.log(`✓ NFTMintAttacker deployed to: ${nftMintAttackerAddress}`);

  // Deploy CoinFlipAttacker
  const CoinFlipAttacker = await ethers.getContractFactory("CoinFlipAttacker");
  const coinFlipAttacker = await CoinFlipAttacker.deploy(
    vulnerableCoinFlipAddress
  );
  await coinFlipAttacker.waitForDeployment();
  const coinFlipAttackerAddress = await coinFlipAttacker.getAddress();
  console.log(`✓ CoinFlipAttacker deployed to: ${coinFlipAttackerAddress}`);

  console.log("-".repeat(60));

  // ===== Our Research: Semantic State Drift =====
  console.log("\n[Our Research] Deploying Semantic State Drift Demo...");

  // Deploy Semantic State Drift Victim with 1000 ETH
  const SemanticStateDriftVictim = await ethers.getContractFactory(
    "SemanticStateDriftVictim"
  );
  const semanticDriftVictim = await SemanticStateDriftVictim.deploy({
    value: ethers.parseEther("1000.0"),
  });
  await semanticDriftVictim.waitForDeployment();
  const semanticDriftVictimAddress = await semanticDriftVictim.getAddress();
  console.log(
    `✓ SemanticStateDriftVictim deployed to: ${semanticDriftVictimAddress}`
  );

  // Deploy Semantic State Drift Exploiter
  const SemanticStateDriftExploiter = await ethers.getContractFactory(
    "SemanticStateDriftExploiter"
  );
  const semanticDriftExploiter = await SemanticStateDriftExploiter.deploy(
    semanticDriftVictimAddress
  );
  await semanticDriftExploiter.waitForDeployment();
  const semanticDriftExploiterAddress =
    await semanticDriftExploiter.getAddress();
  console.log(
    `✓ SemanticStateDriftExploiter deployed to: ${semanticDriftExploiterAddress}`
  );

  console.log("-".repeat(60));

  // ===== Our Research: Event-State Mismatch =====
  console.log("\n[Our Research] Deploying Event-State Mismatch Demo...");

  // Deploy Event-State Mismatch Victim
  const EventStateMismatchVictim = await ethers.getContractFactory(
    "EventStateMismatchVictim"
  );
  const eventMismatchVictim = await EventStateMismatchVictim.deploy();
  await eventMismatchVictim.waitForDeployment();
  const eventMismatchVictimAddress = await eventMismatchVictim.getAddress();
  console.log(
    `✓ EventStateMismatchVictim deployed to: ${eventMismatchVictimAddress}`
  );

  // Deploy Event-State Mismatch Exploiter
  const EventStateMismatchExploiter = await ethers.getContractFactory(
    "EventStateMismatchExploiter"
  );
  const eventMismatchExploiter = await EventStateMismatchExploiter.deploy(
    eventMismatchVictimAddress
  );
  await eventMismatchExploiter.waitForDeployment();
  const eventMismatchExploiterAddress =
    await eventMismatchExploiter.getAddress();
  console.log(
    `✓ EventStateMismatchExploiter deployed to: ${eventMismatchExploiterAddress}`
  );

  console.log("=".repeat(60));
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("SC01 - Access Control:");
  console.log(`  VulnerableWallet: ${walletAddress}`);
  console.log(`  AccessControlAttacker: ${accessAttackerAddress}`);
  console.log("\nSC02 - Price Oracle Manipulation:");
  console.log(`  VulnerableDEX: ${dexAddress}`);
  console.log(`  PriceManipulationAttacker: ${priceAttackerAddress}`);
  console.log("\nSC03 - Logic Errors:");
  console.log(`  UnfairDistribution: ${unfairDistributionAddress}`);
  console.log(`  LogicErrorExploiter: ${logicErrorExploiterAddress}`);
  console.log("\nSC04 - Lack of Input Validation:");
  console.log(`  TokenSale: ${tokenSaleAddress}`);
  console.log(`  InputValidationExploiter: ${inputValidationExploiterAddress}`);
  console.log("\nSC05 - Reentrancy:");
  console.log(`  VulnerableBank: ${bankAddress}`);
  console.log(`  Attacker: ${attackerAddress}`);
  console.log("\nSC06 - Unchecked External Calls:");
  console.log(`  PaymentProcessor: ${paymentProcessorAddress}`);
  console.log(`  UncheckedCallExploiter: ${uncheckedCallExploiterAddress}`);
  console.log("\nSC07 - Flash Loan Attacks:");
  console.log(`  SimpleFlashLoanProvider: ${flashLoanProviderAddress}`);
  console.log(`  VulnerableGovernance: ${vulnerableGovernanceAddress}`);
  console.log(`  VulnerablePriceOracle: ${vulnerablePriceOracleAddress}`);
  console.log(`  GovernanceAttacker: ${governanceAttackerAddress}`);
  console.log(
    `  PriceManipulationFlashAttacker: ${priceManipulationFlashAttackerAddress}`
  );
  console.log("\nSC08 - Integer Overflow and Underflow:");
  console.log(`  IntegerOverflowVictim: ${integerOverflowVictimAddress}`);
  console.log(`  TimeLockVictim: ${timeLockVictimAddress}`);
  console.log(`  IntegerOverflowAttacker: ${integerOverflowAttackerAddress}`);
  console.log(`  TimeLockAttacker: ${timeLockAttackerAddress}`);
  console.log("\nSC09 - Insecure Randomness:");
  console.log(`  InsecureRandomnessVictim: ${insecureRandomnessVictimAddress}`);
  console.log(`  VulnerableNFTMint: ${vulnerableNFTMintAddress}`);
  console.log(`  VulnerableCoinFlip: ${vulnerableCoinFlipAddress}`);
  console.log(
    `  InsecureRandomnessAttacker: ${insecureRandomnessAttackerAddress}`
  );
  console.log(`  NFTMintAttacker: ${nftMintAttackerAddress}`);
  console.log(`  CoinFlipAttacker: ${coinFlipAttackerAddress}`);
  console.log("\nOur Research - Semantic State Drift:");
  console.log(`  SemanticStateDriftVictim: ${semanticDriftVictimAddress}`);
  console.log(
    `  SemanticStateDriftExploiter: ${semanticDriftExploiterAddress}`
  );
  console.log("\nOur Research - Event-State Mismatch:");
  console.log(`  EventStateMismatchVictim: ${eventMismatchVictimAddress}`);
  console.log(
    `  EventStateMismatchExploiter: ${eventMismatchExploiterAddress}`
  );
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
