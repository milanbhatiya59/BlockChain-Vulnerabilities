// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Vulnerable Contract: SimpleFlashLoanProvider
// This contract provides flash loans without proper checks
contract SimpleFlashLoanProvider {
    mapping(address => uint256) public deposits;
    uint256 public totalLiquidity;
    
    event Deposited(address indexed user, uint256 amount);
    event FlashLoan(address indexed borrower, uint256 amount);
    
    // Constructor to accept initial funding
    constructor() payable {
        totalLiquidity = msg.value;
    }
    
    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        deposits[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    function flashLoan(uint256 amount) external {
        require(amount <= totalLiquidity, "Not enough liquidity");
        
        uint256 balanceBefore = address(this).balance;
        
        // Send the flash loan
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // Expect repayment
        uint256 balanceAfter = address(this).balance;
        require(balanceAfter >= balanceBefore, "Flash loan not repaid");
        
        emit FlashLoan(msg.sender, amount);
    }
    
    // Allow contract to receive ETH for flash loan repayment
    receive() external payable {}
    
    fallback() external payable {}
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// Vulnerable Contract: VulnerableGovernance
// This contract has a governance system vulnerable to flash loan attacks
contract VulnerableGovernance {
    mapping(address => uint256) public votingPower;
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public totalVotingPower;
    
    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        address proposer;
    }
    
    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    
    // Constructor to accept initial treasury funding
    constructor() payable {}
    
    // VULNERABILITY: Voting power can be acquired and used in the same transaction
    function depositForVoting() external payable {
        require(msg.value > 0, "Must deposit something");
        votingPower[msg.sender] += msg.value;
        totalVotingPower += msg.value;
    }
    
    function withdrawFromVoting(uint256 amount) external {
        require(votingPower[msg.sender] >= amount, "Insufficient voting power");
        votingPower[msg.sender] -= amount;
        totalVotingPower -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function createProposal(string memory description) external returns (uint256) {
        uint256 proposalId = proposalCount++;
        proposals[proposalId] = Proposal({
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            proposer: msg.sender
        });
        
        emit ProposalCreated(proposalId, description);
        return proposalId;
    }
    
    // VULNERABILITY: No protection against flash loan manipulation
    function vote(uint256 proposalId, bool support) external {
        require(proposalId < proposalCount, "Invalid proposal");
        require(votingPower[msg.sender] > 0, "No voting power");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");
        
        uint256 weight = votingPower[msg.sender];
        
        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }
        
        emit Voted(proposalId, msg.sender, support, weight);
    }
    
    function executeProposal(uint256 proposalId) external {
        require(proposalId < proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal rejected");
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId);
        
        // Execute proposal logic here (simplified)
    }
    
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed
    ) {
        Proposal memory proposal = proposals[proposalId];
        return (proposal.description, proposal.votesFor, proposal.votesAgainst, proposal.executed);
    }
}

// Vulnerable Contract: VulnerablePriceOracle
// This contract determines prices based on instant balance ratios
contract VulnerablePriceOracle {
    uint256 public tokenReserve = 1000 ether;
    uint256 public ethReserve = 100 ether;
    
    event PriceQueried(address indexed querier, uint256 price);
    
    // Constructor to accept initial liquidity
    constructor() payable {
        ethReserve = msg.value;
    }
    
    // VULNERABILITY: Price is calculated based on current reserves without TWAP
    function getPrice() external view returns (uint256) {
        // Price = ETH reserve / Token reserve
        return (ethReserve * 1e18) / tokenReserve;
    }
    
    function swap(uint256 tokenAmount, bool buyTokens) external payable {
        if (buyTokens) {
            require(msg.value > 0, "Must send ETH");
            uint256 tokensOut = (tokenReserve * msg.value) / (ethReserve + msg.value);
            tokenReserve -= tokensOut;
            ethReserve += msg.value;
        } else {
            require(tokenAmount > 0, "Must send tokens");
            uint256 ethOut = (ethReserve * tokenAmount) / (tokenReserve + tokenAmount);
            ethReserve -= ethOut;
            tokenReserve += tokenAmount;
            
            (bool success, ) = msg.sender.call{value: ethOut}("");
            require(success, "Transfer failed");
        }
    }
    
    function addLiquidity(uint256 tokenAmount) external payable {
        require(msg.value > 0 && tokenAmount > 0, "Must provide liquidity");
        ethReserve += msg.value;
        tokenReserve += tokenAmount;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
