// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

// Simple DEX with manipulable price oracle
contract VulnerableDEX {
    mapping(address => uint) public tokenBalance;
    mapping(address => uint) public ethBalance;
    
    uint public tokenReserve;
    uint public ethReserve;
    uint public constant INITIAL_SUPPLY = 1000 ether;
    
    address public owner;
    
    constructor() payable {
        owner = msg.sender;
        require(msg.value >= 100 ether, "Need at least 100 ETH to initialize");
        
        // Initialize liquidity pool
        tokenReserve = INITIAL_SUPPLY;
        ethReserve = msg.value;
        
        console.log("DEX initialized with tokens:", tokenReserve / 1 ether);
        console.log("DEX initialized with ETH:", ethReserve / 1 ether);
    }
    
    // VULNERABILITY: Uses spot price for critical decisions
    // Price can be manipulated with a single large trade
    function getPrice() public view returns (uint) {
        // Simple constant product formula: price = ethReserve / tokenReserve
        // This is vulnerable to flash loan attacks and manipulation
        require(tokenReserve > 0, "No liquidity");
        return (ethReserve * 1e18) / tokenReserve;
    }
    
    // User deposits tokens to get credit
    function depositTokens(uint tokenAmount) public {
        require(tokenAmount > 0, "Must deposit some tokens");
        tokenBalance[msg.sender] += tokenAmount;
        tokenReserve += tokenAmount;
        
        console.log("User deposited", tokenAmount / 1 ether, "tokens");
    }
    
    // User can borrow ETH based on their token collateral
    // VULNERABILITY: Uses manipulable spot price for collateral valuation
    function borrowETH(uint ethAmount) public {
        uint currentPrice = getPrice();
        uint requiredCollateral = (ethAmount * 1e18 * 150) / (currentPrice * 100); // 150% collateralization
        
        require(tokenBalance[msg.sender] >= requiredCollateral, "Insufficient collateral");
        require(ethReserve >= ethAmount, "Not enough ETH in reserve");
        
        ethBalance[msg.sender] += ethAmount;
        ethReserve -= ethAmount;
        
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        console.log("User borrowed", ethAmount / 1 ether, "ETH at price", currentPrice);
    }
    
    // Swap ETH for tokens
    function swapETHForTokens() public payable {
        require(msg.value > 0, "Must send ETH");
        
        // Constant product formula: x * y = k
        uint tokenAmount = (msg.value * tokenReserve) / (ethReserve + msg.value);
        require(tokenAmount > 0, "Invalid swap");
        require(tokenReserve >= tokenAmount, "Not enough tokens");
        
        ethReserve += msg.value;
        tokenReserve -= tokenAmount;
        tokenBalance[msg.sender] += tokenAmount;
        
        console.log("Swapped ETH:", msg.value / 1 ether);
        console.log("Received tokens:", tokenAmount / 1 ether);
        console.log("New price:", getPrice());
    }
    
    // Swap tokens for ETH
    function swapTokensForETH(uint tokenAmount) public {
        require(tokenAmount > 0, "Must send tokens");
        require(tokenBalance[msg.sender] >= tokenAmount, "Insufficient token balance");
        
        // Constant product formula: x * y = k
        uint ethAmount = (tokenAmount * ethReserve) / (tokenReserve + tokenAmount);
        require(ethAmount > 0, "Invalid swap");
        require(ethReserve >= ethAmount, "Not enough ETH");
        
        tokenBalance[msg.sender] -= tokenAmount;
        tokenReserve += tokenAmount;
        ethReserve -= ethAmount;
        
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        console.log("Swapped tokens:", tokenAmount / 1 ether);
        console.log("Received ETH:", ethAmount / 1 ether);
        console.log("New price:", getPrice());
    }
    
    function getReserves() public view returns (uint, uint) {
        return (tokenReserve, ethReserve);
    }
    
    function getTokenBalance(address user) public view returns (uint) {
        return tokenBalance[user];
    }
    
    function getETHBalance(address user) public view returns (uint) {
        return ethBalance[user];
    }
    
    receive() external payable {}
}
