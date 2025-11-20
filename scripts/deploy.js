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

  console.log("-".repeat(60));

  // ===== Research Paper: Exploit Chain Risk =====
  console.log("\n[Research Paper] Deploying Exploit Chain Risk Demo...");

  // Deploy GovToken
  const GovToken = await ethers.getContractFactory("GovToken");
  const govToken = await GovToken.deploy();
  await govToken.waitForDeployment();
  const govTokenAddress = await govToken.getAddress();
  console.log(`✓ GovToken deployed to: ${govTokenAddress}`);

  // Deploy ProtocolVault
  const ProtocolVault = await ethers.getContractFactory("ProtocolVault");
  const protocolVault = await ProtocolVault.deploy(govTokenAddress);
  await protocolVault.waitForDeployment();
  const protocolVaultAddress = await protocolVault.getAddress();
  console.log(`✓ ProtocolVault deployed to: ${protocolVaultAddress}`);
  
  // Fund ProtocolVault with 50 ETH
  const [deployer] = await ethers.getSigners();
  await deployer.sendTransaction({
    to: protocolVaultAddress,
    value: ethers.parseEther("50.0"),
  });
  console.log(`✓ ProtocolVault funded with 50 ETH`);

  // Deploy ExploitChainSystem with 30 ETH
  const ExploitChainSystem = await ethers.getContractFactory(
    "ExploitChainSystem"
  );
  const exploitChainSystem = await ExploitChainSystem.deploy(
    govTokenAddress,
    protocolVaultAddress,
    {
      value: ethers.parseEther("30.0"),
    }
  );
  await exploitChainSystem.waitForDeployment();
  const exploitChainSystemAddress = await exploitChainSystem.getAddress();
  console.log(`✓ ExploitChainSystem deployed to: ${exploitChainSystemAddress}`);

  // Deploy VulnerableProtocol
  const VulnerableProtocol = await ethers.getContractFactory(
    "VulnerableProtocol"
  );
  const vulnerableProtocol = await VulnerableProtocol.deploy(
    govTokenAddress,
    protocolVaultAddress
  );
  await vulnerableProtocol.waitForDeployment();
  const vulnerableProtocolAddress = await vulnerableProtocol.getAddress();
  console.log(`✓ VulnerableProtocol deployed to: ${vulnerableProtocolAddress}`);

  // Deploy ExploitChainAttacker
  const ExploitChainAttacker = await ethers.getContractFactory(
    "ExploitChainAttacker"
  );
  const exploitChainAttacker = await ExploitChainAttacker.deploy(
    govTokenAddress,
    protocolVaultAddress
  );
  await exploitChainAttacker.waitForDeployment();
  const exploitChainAttackerAddress = await exploitChainAttacker.getAddress();
  console.log(
    `✓ ExploitChainAttacker deployed to: ${exploitChainAttackerAddress}`
  );

  // Deploy SystemExploiter
  const SystemExploiter = await ethers.getContractFactory("SystemExploiter");
  const systemExploiter = await SystemExploiter.deploy(
    exploitChainSystemAddress
  );
  await systemExploiter.waitForDeployment();
  const systemExploiterAddress = await systemExploiter.getAddress();
  console.log(`✓ SystemExploiter deployed to: ${systemExploiterAddress}`);

  // Deploy PrivilegeEscalationAttacker
  const PrivilegeEscalationAttacker = await ethers.getContractFactory(
    "PrivilegeEscalationAttacker"
  );
  const privilegeEscalationAttacker =
    await PrivilegeEscalationAttacker.deploy();
  await privilegeEscalationAttacker.waitForDeployment();
  const privilegeEscalationAttackerAddress =
    await privilegeEscalationAttacker.getAddress();
  console.log(
    `✓ PrivilegeEscalationAttacker deployed to: ${privilegeEscalationAttackerAddress}`
  );

  console.log("-".repeat(60));

  // ===== Research Paper: Inconsistent State Update =====
  console.log("\n[Research Paper] Deploying Inconsistent State Update Demo...");

  // Deploy InconsistentStateToken
  const InconsistentStateToken = await ethers.getContractFactory(
    "InconsistentStateToken"
  );
  const inconsistentToken = await InconsistentStateToken.deploy();
  await inconsistentToken.waitForDeployment();
  const inconsistentTokenAddress = await inconsistentToken.getAddress();
  console.log(
    `✓ InconsistentStateToken deployed to: ${inconsistentTokenAddress}`
  );

  // Deploy InconsistentVault
  const InconsistentVault = await ethers.getContractFactory(
    "InconsistentVault"
  );
  const inconsistentVault = await InconsistentVault.deploy();
  await inconsistentVault.waitForDeployment();
  const inconsistentVaultAddress = await inconsistentVault.getAddress();
  console.log(
    `✓ InconsistentVault deployed to: ${inconsistentVaultAddress}`
  );

  // Deploy InconsistentRewardPool
  const InconsistentRewardPool = await ethers.getContractFactory(
    "InconsistentRewardPool"
  );
  const inconsistentRewardPool = await InconsistentRewardPool.deploy();
  await inconsistentRewardPool.waitForDeployment();
  const inconsistentRewardPoolAddress =
    await inconsistentRewardPool.getAddress();
  console.log(
    `✓ InconsistentRewardPool deployed to: ${inconsistentRewardPoolAddress}`
  );

  // Deploy StateCorruptionSystem
  const StateCorruptionSystem = await ethers.getContractFactory(
    "StateCorruptionSystem"
  );
  const stateCorruptionSystem = await StateCorruptionSystem.deploy();
  await stateCorruptionSystem.waitForDeployment();
  const stateCorruptionSystemAddress =
    await stateCorruptionSystem.getAddress();
  console.log(
    `✓ StateCorruptionSystem deployed to: ${stateCorruptionSystemAddress}`
  );

  // Deploy StateManipulator
  const StateManipulator = await ethers.getContractFactory("StateManipulator");
  const stateManipulator = await StateManipulator.deploy(
    inconsistentTokenAddress
  );
  await stateManipulator.waitForDeployment();
  const stateManipulatorAddress = await stateManipulator.getAddress();
  console.log(`✓ StateManipulator deployed to: ${stateManipulatorAddress}`);

  // Deploy VaultDrainer
  const VaultDrainer = await ethers.getContractFactory("VaultDrainer");
  const vaultDrainer = await VaultDrainer.deploy(inconsistentVaultAddress);
  await vaultDrainer.waitForDeployment();
  const vaultDrainerAddress = await vaultDrainer.getAddress();
  console.log(`✓ VaultDrainer deployed to: ${vaultDrainerAddress}`);

  // Deploy RewardPoolExploiter
  const RewardPoolExploiter = await ethers.getContractFactory(
    "RewardPoolExploiter"
  );
  const rewardPoolExploiter = await RewardPoolExploiter.deploy(
    inconsistentRewardPoolAddress
  );
  await rewardPoolExploiter.waitForDeployment();
  const rewardPoolExploiterAddress = await rewardPoolExploiter.getAddress();
  console.log(
    `✓ RewardPoolExploiter deployed to: ${rewardPoolExploiterAddress}`
  );

  // Deploy SystemCorruptor
  const SystemCorruptor = await ethers.getContractFactory("SystemCorruptor");
  const systemCorruptor = await SystemCorruptor.deploy(
    stateCorruptionSystemAddress
  );
  await systemCorruptor.waitForDeployment();
  const systemCorruptorAddress = await systemCorruptor.getAddress();
  console.log(`✓ SystemCorruptor deployed to: ${systemCorruptorAddress}`);

  // ========================================================================
  // Research Paper - Semantic Level Bug
  // ========================================================================
  console.log("\n" + "=".repeat(60));
  console.log("Deploying Research Paper - Semantic Level Bug contracts...");
  console.log("=".repeat(60));

  console.log("\nDeploying Victim Contracts...");

  // Deploy SemanticOpcodeBugDemo
  const SemanticOpcodeBugDemo = await ethers.getContractFactory(
    "SemanticOpcodeBugDemo"
  );
  const semanticOpcodeBugDemo = await SemanticOpcodeBugDemo.deploy();
  await semanticOpcodeBugDemo.waitForDeployment();
  const semanticOpcodeBugDemoAddress =
    await semanticOpcodeBugDemo.getAddress();
  console.log(
    `✓ SemanticOpcodeBugDemo deployed to: ${semanticOpcodeBugDemoAddress}`
  );

  // Deploy WrongSlotVault
  const WrongSlotVault = await ethers.getContractFactory("WrongSlotVault");
  const wrongSlotVault = await WrongSlotVault.deploy();
  await wrongSlotVault.waitForDeployment();
  const wrongSlotVaultAddress = await wrongSlotVault.getAddress();
  console.log(`✓ WrongSlotVault deployed to: ${wrongSlotVaultAddress}`);

  // Deploy PackedStorageBug
  const PackedStorageBug = await ethers.getContractFactory("PackedStorageBug");
  const packedStorageBug = await PackedStorageBug.deploy();
  await packedStorageBug.waitForDeployment();
  const packedStorageBugAddress = await packedStorageBug.getAddress();
  console.log(`✓ PackedStorageBug deployed to: ${packedStorageBugAddress}`);

  // Deploy DynamicArrayBug
  const DynamicArrayBug = await ethers.getContractFactory("DynamicArrayBug");
  const dynamicArrayBug = await DynamicArrayBug.deploy();
  await dynamicArrayBug.waitForDeployment();
  const dynamicArrayBugAddress = await dynamicArrayBug.getAddress();
  console.log(`✓ DynamicArrayBug deployed to: ${dynamicArrayBugAddress}`);

  // Deploy SemanticBugSystem
  const SemanticBugSystem = await ethers.getContractFactory(
    "SemanticBugSystem"
  );
  const semanticBugSystem = await SemanticBugSystem.deploy();
  await semanticBugSystem.waitForDeployment();
  const semanticBugSystemAddress = await semanticBugSystem.getAddress();
  console.log(`✓ SemanticBugSystem deployed to: ${semanticBugSystemAddress}`);

  console.log("\nDeploying Attacker Contracts...");

  // Deploy OpcodeExploiter
  const OpcodeExploiter = await ethers.getContractFactory("OpcodeExploiter");
  const opcodeExploiter = await OpcodeExploiter.deploy(
    semanticOpcodeBugDemoAddress
  );
  await opcodeExploiter.waitForDeployment();
  const opcodeExploiterAddress = await opcodeExploiter.getAddress();
  console.log(`✓ OpcodeExploiter deployed to: ${opcodeExploiterAddress}`);

  // Deploy VaultStorageAttacker
  const VaultStorageAttacker = await ethers.getContractFactory(
    "VaultStorageAttacker"
  );
  const vaultStorageAttacker = await VaultStorageAttacker.deploy(
    wrongSlotVaultAddress
  );
  await vaultStorageAttacker.waitForDeployment();
  const vaultStorageAttackerAddress = await vaultStorageAttacker.getAddress();
  console.log(
    `✓ VaultStorageAttacker deployed to: ${vaultStorageAttackerAddress}`
  );

  // Deploy PackedStorageExploiter
  const PackedStorageExploiter = await ethers.getContractFactory(
    "PackedStorageExploiter"
  );
  const packedStorageExploiter = await PackedStorageExploiter.deploy(
    packedStorageBugAddress
  );
  await packedStorageExploiter.waitForDeployment();
  const packedStorageExploiterAddress =
    await packedStorageExploiter.getAddress();
  console.log(
    `✓ PackedStorageExploiter deployed to: ${packedStorageExploiterAddress}`
  );

  // Deploy ArraySlotExploiter
  const ArraySlotExploiter = await ethers.getContractFactory(
    "ArraySlotExploiter"
  );
  const arraySlotExploiter = await ArraySlotExploiter.deploy(
    dynamicArrayBugAddress
  );
  await arraySlotExploiter.waitForDeployment();
  const arraySlotExploiterAddress = await arraySlotExploiter.getAddress();
  console.log(
    `✓ ArraySlotExploiter deployed to: ${arraySlotExploiterAddress}`
  );

  // Deploy SystemWideCorruptor
  const SystemWideCorruptor = await ethers.getContractFactory(
    "SystemWideCorruptor"
  );
  const systemWideCorruptor = await SystemWideCorruptor.deploy(
    semanticBugSystemAddress
  );
  await systemWideCorruptor.waitForDeployment();
  const systemWideCorruptorAddress = await systemWideCorruptor.getAddress();
  console.log(
    `✓ SystemWideCorruptor deployed to: ${systemWideCorruptorAddress}`
  );

  // ========================================================================
  // Research Paper - State Machine Dependency
  // ========================================================================
  console.log("\n" + "=".repeat(60));
  console.log("Deploying Research Paper - State Machine Dependency contracts...");
  console.log("=".repeat(60));

  console.log("\nDeploying Victim Contracts...");

  // Deploy FragileEscrow
  const FragileEscrow = await ethers.getContractFactory("FragileEscrow");
  const fragileEscrow = await FragileEscrow.deploy(processor.address);
  await fragileEscrow.waitForDeployment();
  const fragileEscrowAddress = await fragileEscrow.getAddress();
  console.log(`✓ FragileEscrow deployed to: ${fragileEscrowAddress}`);

  // Deploy MultiStageVoting
  const MultiStageVoting = await ethers.getContractFactory("MultiStageVoting");
  const multiStageVoting = await MultiStageVoting.deploy();
  await multiStageVoting.waitForDeployment();
  const multiStageVotingAddress = await multiStageVoting.getAddress();
  console.log(`✓ MultiStageVoting deployed to: ${multiStageVotingAddress}`);

  // Deploy TimedAuction (1 hour bidding, 30 min reveal)
  const TimedAuction = await ethers.getContractFactory("TimedAuction");
  const timedAuction = await TimedAuction.deploy(3600, 1800);
  await timedAuction.waitForDeployment();
  const timedAuctionAddress = await timedAuction.getAddress();
  console.log(`✓ TimedAuction deployed to: ${timedAuctionAddress}`);

  // Deploy StateMachineDependencySystem
  const StateMachineDependencySystem = await ethers.getContractFactory(
    "StateMachineDependencySystem"
  );
  const stateMachineSystem = await StateMachineDependencySystem.deploy(
    processor.address,
    3600,
    1800
  );
  await stateMachineSystem.waitForDeployment();
  const stateMachineSystemAddress = await stateMachineSystem.getAddress();
  console.log(
    `✓ StateMachineDependencySystem deployed to: ${stateMachineSystemAddress}`
  );

  console.log("\nDeploying Attacker Contracts...");

  // Deploy EscrowReentrancyAttacker
  const EscrowReentrancyAttacker = await ethers.getContractFactory(
    "EscrowReentrancyAttacker"
  );
  const escrowReentrancyAttacker = await EscrowReentrancyAttacker.deploy(
    fragileEscrowAddress
  );
  await escrowReentrancyAttacker.waitForDeployment();
  const escrowReentrancyAttackerAddress =
    await escrowReentrancyAttacker.getAddress();
  console.log(
    `✓ EscrowReentrancyAttacker deployed to: ${escrowReentrancyAttackerAddress}`
  );

  // Deploy VotingManipulationAttacker
  const VotingManipulationAttacker = await ethers.getContractFactory(
    "VotingManipulationAttacker"
  );
  const votingManipulationAttacker = await VotingManipulationAttacker.deploy(
    multiStageVotingAddress
  );
  await votingManipulationAttacker.waitForDeployment();
  const votingManipulationAttackerAddress =
    await votingManipulationAttacker.getAddress();
  console.log(
    `✓ VotingManipulationAttacker deployed to: ${votingManipulationAttackerAddress}`
  );

  // Deploy AuctionTimingAttacker
  const AuctionTimingAttacker = await ethers.getContractFactory(
    "AuctionTimingAttacker"
  );
  const auctionTimingAttacker = await AuctionTimingAttacker.deploy(
    timedAuctionAddress
  );
  await auctionTimingAttacker.waitForDeployment();
  const auctionTimingAttackerAddress =
    await auctionTimingAttacker.getAddress();
  console.log(
    `✓ AuctionTimingAttacker deployed to: ${auctionTimingAttackerAddress}`
  );

  // Deploy ProcessorImpersonator
  const ProcessorImpersonator = await ethers.getContractFactory(
    "ProcessorImpersonator"
  );
  const processorImpersonator = await ProcessorImpersonator.deploy(
    fragileEscrowAddress
  );
  await processorImpersonator.waitForDeployment();
  const processorImpersonatorAddress =
    await processorImpersonator.getAddress();
  console.log(
    `✓ ProcessorImpersonator deployed to: ${processorImpersonatorAddress}`
  );

  // Deploy SystemWideStateMachineAttacker
  const SystemWideStateMachineAttacker = await ethers.getContractFactory(
    "SystemWideStateMachineAttacker"
  );
  const systemWideStateMachineAttacker =
    await SystemWideStateMachineAttacker.deploy(stateMachineSystemAddress);
  await systemWideStateMachineAttacker.waitForDeployment();
  const systemWideStateMachineAttackerAddress =
    await systemWideStateMachineAttacker.getAddress();
  console.log(
    `✓ SystemWideStateMachineAttacker deployed to: ${systemWideStateMachineAttackerAddress}`
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
  console.log("\nResearch Paper - Exploit Chain Risk:");
  console.log(`  GovToken: ${govTokenAddress}`);
  console.log(`  ProtocolVault: ${protocolVaultAddress}`);
  console.log(`  ExploitChainSystem: ${exploitChainSystemAddress}`);
  console.log(`  VulnerableProtocol: ${vulnerableProtocolAddress}`);
  console.log(`  ExploitChainAttacker: ${exploitChainAttackerAddress}`);
  console.log(`  SystemExploiter: ${systemExploiterAddress}`);
  console.log(
    `  PrivilegeEscalationAttacker: ${privilegeEscalationAttackerAddress}`
  );
  console.log("\nResearch Paper - Inconsistent State Update:");
  console.log(`  InconsistentStateToken: ${inconsistentTokenAddress}`);
  console.log(`  InconsistentVault: ${inconsistentVaultAddress}`);
  console.log(`  InconsistentRewardPool: ${inconsistentRewardPoolAddress}`);
  console.log(`  StateCorruptionSystem: ${stateCorruptionSystemAddress}`);
  console.log(`  StateManipulator: ${stateManipulatorAddress}`);
  console.log(`  VaultDrainer: ${vaultDrainerAddress}`);
  console.log(`  RewardPoolExploiter: ${rewardPoolExploiterAddress}`);
  console.log(`  SystemCorruptor: ${systemCorruptorAddress}`);
  console.log("\nResearch Paper - Semantic Level Bug:");
  console.log(`  SemanticOpcodeBugDemo: ${semanticOpcodeBugDemoAddress}`);
  console.log(`  WrongSlotVault: ${wrongSlotVaultAddress}`);
  console.log(`  PackedStorageBug: ${packedStorageBugAddress}`);
  console.log(`  DynamicArrayBug: ${dynamicArrayBugAddress}`);
  console.log(`  SemanticBugSystem: ${semanticBugSystemAddress}`);
  console.log(`  OpcodeExploiter: ${opcodeExploiterAddress}`);
  console.log(`  VaultStorageAttacker: ${vaultStorageAttackerAddress}`);
  console.log(`  PackedStorageExploiter: ${packedStorageExploiterAddress}`);
  console.log(`  ArraySlotExploiter: ${arraySlotExploiterAddress}`);
  console.log(`  SystemWideCorruptor: ${systemWideCorruptorAddress}`);
  console.log("\nResearch Paper - State Machine Dependency:");
  console.log(`  FragileEscrow: ${fragileEscrowAddress}`);
  console.log(`  MultiStageVoting: ${multiStageVotingAddress}`);
  console.log(`  TimedAuction: ${timedAuctionAddress}`);
  console.log(`  StateMachineDependencySystem: ${stateMachineSystemAddress}`);
  console.log(
    `  EscrowReentrancyAttacker: ${escrowReentrancyAttackerAddress}`
  );
  console.log(
    `  VotingManipulationAttacker: ${votingManipulationAttackerAddress}`
  );
  console.log(`  AuctionTimingAttacker: ${auctionTimingAttackerAddress}`);
  console.log(`  ProcessorImpersonator: ${processorImpersonatorAddress}`);
  console.log(
    `  SystemWideStateMachineAttacker: ${systemWideStateMachineAttackerAddress}`
  );
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
