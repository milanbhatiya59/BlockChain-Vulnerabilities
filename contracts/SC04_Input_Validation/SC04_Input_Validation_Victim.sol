// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Vulnerable Contract: TokenSale
// This contract is designed to sell tokens to users.
// However, it lacks proper input validation, which can lead to various issues
// such as accepting zero values, allowing unbounded purchases, or accepting invalid data.

contract TokenSale {
    mapping(address => uint256) public balances;
    uint256 public tokenPrice = 1 ether; // 1 token = 1 ETH
    uint256 public totalSupply = 1000;
    uint256 public soldTokens = 0;
    address public owner;

    event TokensPurchased(address indexed buyer, uint256 amount, uint256 totalCost);
    event TokensTransferred(address indexed from, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // Function to purchase tokens
    // Vulnerability: Lacks input validation
    // - Doesn't check if amount is 0
    // - Doesn't check if purchase would exceed total supply
    // - Doesn't validate the ETH sent matches the required amount
    function purchaseTokens(uint256 amount) external payable {
        // Missing validation: should check amount > 0
        // Missing validation: should check soldTokens + amount <= totalSupply
        // Missing validation: should check msg.value == amount * tokenPrice
        
        balances[msg.sender] += amount;
        soldTokens += amount;
        
        emit TokensPurchased(msg.sender, amount, msg.value);
    }

    // Function to transfer tokens
    // Vulnerability: Lacks input validation
    // - Doesn't check if amount is 0
    // - Doesn't check if recipient is zero address
    // - Doesn't check if sender has sufficient balance
    function transfer(address to, uint256 amount) external {
        // Missing validation: should check to != address(0)
        // Missing validation: should check amount > 0
        // Missing validation: should check balances[msg.sender] >= amount
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit TokensTransferred(msg.sender, to, amount);
    }

    // Function to set token price (only owner)
    // Vulnerability: Lacks input validation on price
    function setTokenPrice(uint256 newPrice) external {
        // Missing validation: should check msg.sender == owner
        // Missing validation: should check newPrice > 0
        
        tokenPrice = newPrice;
    }

    // Function to withdraw ETH (only owner)
    function withdraw() external {
        // Missing validation: should check msg.sender == owner
        
        payable(msg.sender).transfer(address(this).balance);
    }

    // Function to check contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
