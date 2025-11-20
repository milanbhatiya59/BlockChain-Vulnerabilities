# Smart Contract Vulnerability Analysis: Reentrancy Attack

This document provides a detailed analysis of a reentrancy vulnerability, demonstrating how it can be exploited and how it can be detected using static and dynamic analysis techniques.

## 1. Attack Setup

The setup for this reentrancy attack scenario involves two smart contracts: a vulnerable contract and an attacker contract.

### `VulnerableBank.sol`

This contract simulates a simple bank that allows users to deposit and withdraw Ether.

**Vulnerable Logic:**

The `withdraw` function is vulnerable to a reentrancy attack.

```solidity
function withdraw() public {
    uint amount = balances[msg.sender];
    require(amount > 0, "Insufficient balance");

    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Failed to send Ether");

    balances[msg.sender] = 0;
}
```

The vulnerability lies in the order of operations. The contract sends Ether to the `msg.sender` **before** it updates the sender's balance to zero. This allows an attacker to re-enter the `withdraw` function multiple times before their balance is updated, effectively draining the contract's funds.

### `Attacker.sol`

This contract is designed to exploit the reentrancy vulnerability in `VulnerableBank`.

**Attack Logic:**

1.  **`attack()` function:** The attacker initiates the attack by calling the `attack()` function with some amount of Ether (e.g., 1 ETH). This function first deposits the Ether into `VulnerableBank` and then calls `withdraw()`.
2.  **`receive()` fallback function:** When `VulnerableBank` sends Ether to the `Attacker` contract (via `msg.sender.call{value: amount}("")`), the `Attacker`'s `receive()` function is triggered.
3.  **Re-entrant call:** Inside the `receive()` function, the `Attacker` contract checks if the `VulnerableBank` still has a balance. If it does, it calls `vulnerableBank.withdraw()` again. This re-entrant call happens before the `VulnerableBank` has had a chance to update the `Attacker`'s balance from the *previous* withdrawal. This loop continues until the `VulnerableBank` is drained of all its Ether.

```solidity
contract Attacker {
    VulnerableBank public vulnerableBank;
    // ... constructor ...

    receive() external payable {
        if (address(vulnerableBank).balance > 0) {
            vulnerableBank.withdraw();
        }
    }

    function attack() public payable {
        vulnerableBank.deposit{value: msg.value}();
        vulnerableBank.withdraw();
    }
    // ...
}
```

## 2. Dynamic Analysis

Dynamic analysis involves executing the smart contracts in a simulated environment to observe their behavior and identify vulnerabilities at runtime.

### Methodology

The dynamic analysis is performed using a Hardhat script (`dynamic-analysis/SC05_Reentrancy_Attack.js`). The script automates the following steps:

1.  **Deployment:** Both `VulnerableBank` and `Attacker` contracts are deployed to a local Hardhat test network.
2.  **Funding:** The `VulnerableBank` is funded with an initial amount of Ether (e.g., 10 ETH).
3.  **Attack Execution:** The `attack()` function on the `Attacker` contract is called. The attacker sends 1 ETH to start the process.
4.  **Verification:** After the attack transaction is complete, the script checks the final balances of both the `VulnerableBank` and the `Attacker` contract.

A successful attack is confirmed if the `VulnerableBank`'s balance is drained and the `Attacker` contract's balance has increased correspondingly.

### Technology Stack

*   **Hardhat:** A development environment to compile, deploy, test, and debug Ethereum software.
*   **Ethers.js:** A library for interacting with the Ethereum Blockchain and its ecosystem.
*   **Node.js:** A JavaScript runtime used to execute the Hardhat scripts.

## 3. Static Analysis

Static analysis involves examining the smart contract's source code without executing it to identify potential vulnerabilities.

### Methodology

The static analysis is performed using the `solhint` tool, which is a popular linter for Solidity. The script `static-analysis/SC05_Reentrancy_Attack.js` executes `solhint` on the `VulnerableBank.sol` contract.

```javascript
exec(
  'npx solhint "contracts/SC05_Reentrancy_Attack/SC05_Reentrancy_Victim.sol"',
  // ...
);
```

`solhint` analyzes the code for security vulnerabilities and style guide violations. For this specific vulnerability, it will flag the `withdraw` function with a `reentrancy` warning, indicating that an external call is made before a state change.

### Technology Stack

*   **Solhint:** A static analysis tool for Solidity that helps identify security risks and enforce best practices.
*   **Node.js:** Used to run the script that executes `solhint`.
