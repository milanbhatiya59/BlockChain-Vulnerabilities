// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Vulnerable Contract: UnfairDistribution
// This contract is designed to distribute tokens to contributors based on their contributions.
// However, it contains a logic error that allows users to claim more tokens than they are entitled to.

contract UnfairDistribution {
    mapping(address => uint256) public contributions;
    mapping(address => bool) public claimed;
    uint256 public totalContributions;

    // The owner of the contract
    address public owner;

    // Event to log contributions
    event Contribution(address indexed contributor, uint256 amount);

    // Event to log token claims
    event Claimed(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // Function to contribute to the contract
    function contribute() external payable {
        require(msg.value > 0, "Contribution must be greater than 0");
        contributions[msg.sender] += msg.value;
        totalContributions += msg.value;
        emit Contribution(msg.sender, msg.value);
    }

    // Function to claim tokens
    // The logic error is here: it checks if the user has claimed tokens but doesn't check if the contribution is greater than 0.
    // This allows a user to claim tokens even if they haven't contributed.
    function claim() external {
        require(!claimed[msg.sender], "You have already claimed your tokens");

        // This is where the logic error lies.
        // A user who has not contributed can still claim tokens if they have not claimed before.
        // The contract should check if contributions[msg.sender] > 0.
        
        uint256 userContribution = contributions[msg.sender];
        
        // If the user has not contributed, they can still pass the check and receive tokens.
        // This is because the contract doesn't verify that the user has made a contribution.
        
        // Mark the user as claimed
        claimed[msg.sender] = true;

        // Send tokens to the user (for simplicity, we'll just send back the contribution amount)
        payable(msg.sender).transfer(userContribution);

        emit Claimed(msg.sender, userContribution);
    }

    // Function to check the contract's balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
