// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract VulnerableWallet {
    address public owner;
    mapping(address => uint) public balances;
    uint public totalDeposits;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        require(msg.value > 0, "Must deposit some Ether");
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
    }

    // VULNERABILITY: Missing access control modifier
    // Anyone can call this function and change the owner
    function changeOwner(address newOwner) public {
        owner = newOwner;
    }

    // VULNERABILITY: Missing access control modifier
    // Anyone can withdraw all funds from the contract
    function emergencyWithdraw() public {
        uint amount = address(this).balance;
        require(amount > 0, "No funds available");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    // This function should only be callable by the owner, but lacks proper checks
    function withdraw(uint amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getUserBalance(address user) public view returns (uint) {
        return balances[user];
    }
}
