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

The output from `solhint` will highlight the reentrancy issue in the `withdraw` function.

#### Dynamic Analysis (Performing the Attack)

Execute the attack simulation script to demonstrate the reentrancy vulnerability. This script will have the `Attacker` contract drain Ether from the `VulnerableBank`.

```bash
npx hardhat run dynamic-analysis/SC05_Reentrancy_Attack.js --network localhost
```

The script will output the bank's balance before and after the attack, showing that the attack was successful and the bank's funds have been drained.
