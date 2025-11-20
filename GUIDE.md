# Project Execution Guide

## 1. Setup and Deployment

This section describes how to set up the environment, compile, and deploy the smart contracts.

### Install Dependencies

First, you need to install the necessary Node.js packages defined in `package.json`. Open your terminal and run:

```bash
npm install
```

### Compile the Smart Contracts

Compile the Solidity contracts using Hardhat. This will create the necessary artifacts for deployment and testing.

```bash
npx hardhat compile
```

### Start a Local Hardhat Network

To deploy and interact with the contracts, you need to run a local blockchain. Hardhat provides a built-in network for this purpose.

In a new terminal window, run:

```bash
npx hardhat node
```

This will start a local Ethereum node and provide you with a list of test accounts and their private keys. Keep this terminal window open.

### Deploy the Contracts

Now, deploy the contracts to the local Hardhat network. In your original terminal, run the deploy script:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This will output the addresses of the deployed `VulnerableBank` and `Attacker` contracts.

## 2. Vulnerabilities

This section details the vulnerabilities present in the smart contracts and how to exploit them.

### SC05: Reentrancy Attack

The `VulnerableBank` contract is susceptible to a reentrancy attack. The `withdraw` function sends Ether to an external address before updating the user's balance. This allows an attacker to create a malicious contract that calls back into the `withdraw` function multiple times, draining the contract's funds.

#### Static Analysis (Detecting the Vulnerability)

You can run the static analysis script to check the `VulnerableBank` contract for the reentrancy vulnerability.

```bash
node static-analysis/SC05_Reentrancy_Attack.js
```

**Note:** The current implementation uses `solhint`, a basic linter that provides code quality checks but may not detect all security vulnerabilities. For production use, consider using advanced static analysis tools like **Slither** or **Mythril** that employ symbolic execution and deeper analysis techniques as recommended in smart contract security research.

The output from `solhint` will show code style warnings and potential issues. However, it may produce **false negatives** by missing certain security vulnerabilities that more advanced tools would detect.

#### Dynamic Analysis (Fuzz Testing the Attack)

Execute the fuzz testing script to demonstrate and validate the reentrancy vulnerability across multiple test scenarios. This uses property-based testing to verify the vulnerability is exploitable with various input amounts.

```bash
npx hardhat test dynamic-analysis/SC05_Reentrancy_Attack.js
```

The fuzz test will:
- Automatically generate random attack amounts (1-5 ETH)
- Deploy fresh contract instances for each test case
- Execute the reentrancy attack with different parameters
- Verify that the bank is successfully drained in all cases

A passing test confirms the vulnerability is consistently exploitable, demonstrating a **True Positive (TP)** detection where both static analysis flagged a potential issue and dynamic testing confirmed it's actually exploitable.
