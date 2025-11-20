// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
 * State Machine Dependency Vulnerabilities
 * 
 * These contracts demonstrate how fragile state machines with multiple intermediate states
 * can be exploited when transitions depend on external factors (oracles, processors, callbacks)
 * without proper timeouts, validation, or state management.
 */

// ====================================================================
// Contract 1: FragileEscrow
// ====================================================================
/*
 * FragileEscrow
 * - A multi-step process: deposit -> lockForProcessing -> finalizeRelease
 * - The 'locked' intermediate state is fragile; external callbacks or delayed oracle updates
 *   can cause inconsistent transitions. No timeouts or robust checks are provided.
 * - Vulnerabilities:
 *   1. No timeout on locked state (funds can be stuck forever)
 *   2. Locked flag cleared AFTER external call (reentrancy risk)
 *   3. No verification of processor authenticity on finalize
 *   4. No emergency recovery mechanism
 */
contract FragileEscrow {
    mapping(address => uint256) public deposits;
    mapping(address => bool) public locked;
    address public processor; // external service expected to call finalize
    
    event Deposited(address indexed user, uint256 amount);
    event LockedForProcessing(address indexed user);
    event Released(address indexed user, uint256 amount);
    event ProcessorChanged(address indexed oldProcessor, address indexed newProcessor);

    constructor(address _processor) {
        processor = _processor;
    }

    function deposit() external payable {
        require(msg.value > 0, "zero");
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // ❌ VULNERABILITY 1: processor sets 'locked' while some off-chain verification happens
    // No timeout mechanism - funds can be stuck in locked state forever
    function lockForProcessing(address user) external {
        require(msg.sender == processor, "only processor");
        require(deposits[user] > 0, "no deposit");
        // set intermediate state
        locked[user] = true;
        emit LockedForProcessing(user);
    }

    // ❌ VULNERABILITY 2: finalizeRelease depends on off-chain state; if oracle or callback doesn't happen
    // contract can be left in locked state or attacker may find ways to change processor pointer
    // ❌ VULNERABILITY 3: locked flag cleared *after* external call -> reentrancy risk
    function finalizeRelease(address user) external {
        // NOTE: this function assumes processor (off-chain) validated and now calls here
        require(locked[user], "not locked");
        uint256 amount = deposits[user];
        // forget to clear locked before external action (non-checks-effects-interactions)
        // also no verification of current oracle data: fragile transition dependency
        (bool ok, ) = payable(user).call{value: amount}("");
        require(ok, "transfer failed");
        deposits[user] = 0;
        // locked flag cleared *after* external call -> if reentrancy occurs, bad things happen
        locked[user] = false;
        emit Released(user, amount);
    }

    // ❌ VULNERABILITY 4: processor can be changed, breaking state machine assumptions
    function changeProcessor(address newProcessor) external {
        require(msg.sender == processor, "only processor");
        address oldProcessor = processor;
        processor = newProcessor;
        emit ProcessorChanged(oldProcessor, newProcessor);
    }
}

// ====================================================================
// Contract 2: MultiStageVoting
// ====================================================================
/*
 * MultiStageVoting
 * - Voting goes through stages: REGISTRATION -> VOTING -> COUNTING -> FINALIZED
 * - State transitions depend on admin calls without timeouts or validation
 * - Vulnerabilities:
 *   1. Admin can manipulate stage transitions arbitrarily
 *   2. No minimum time requirements between stages
 *   3. Votes can be cast in wrong stages due to race conditions
 *   4. No rollback mechanism if stage transition fails
 */
contract MultiStageVoting {
    enum Stage { REGISTRATION, VOTING, COUNTING, FINALIZED }
    
    Stage public currentStage;
    address public admin;
    
    mapping(address => bool) public registered;
    mapping(address => uint256) public votes; // 0 = no, 1 = yes
    
    uint256 public yesVotes;
    uint256 public noVotes;
    bool public proposalPassed;
    
    event StageChanged(Stage indexed oldStage, Stage indexed newStage);
    event Registered(address indexed voter);
    event VoteCast(address indexed voter, uint256 vote);
    event VotesCounted(uint256 yesVotes, uint256 noVotes);
    event Finalized(bool passed);

    constructor() {
        admin = msg.sender;
        currentStage = Stage.REGISTRATION;
    }

    // ❌ VULNERABILITY 1: Registration depends on being in correct stage
    // Race condition: admin can change stage while user is registering
    function register() external {
        require(currentStage == Stage.REGISTRATION, "not registration stage");
        registered[msg.sender] = true;
        emit Registered(msg.sender);
    }

    // ❌ VULNERABILITY 2: Vote casting checks stage but doesn't prevent double-voting
    // If admin manipulates stages, users could vote multiple times
    function vote(uint256 choice) external {
        require(currentStage == Stage.VOTING, "not voting stage");
        require(registered[msg.sender], "not registered");
        require(choice <= 1, "invalid choice");
        
        // No check for already voted - if stage is reset, can vote again
        votes[msg.sender] = choice;
        emit VoteCast(msg.sender, choice);
    }

    // ❌ VULNERABILITY 3: Count votes depends on being in counting stage
    // Admin can call this multiple times or skip stages
    function countVotes() external {
        require(msg.sender == admin, "only admin");
        require(currentStage == Stage.COUNTING, "not counting stage");
        
        // This is inefficient and vulnerable - should count incrementally
        // For simplicity, we just read the stored votes (in real attack, could be manipulated)
        emit VotesCounted(yesVotes, noVotes);
    }

    // ❌ VULNERABILITY 4: Admin can transition stages arbitrarily without validation
    // No minimum time between stages, no checks for completed actions
    function advanceStage() external {
        require(msg.sender == admin, "only admin");
        Stage oldStage = currentStage;
        
        if (currentStage == Stage.REGISTRATION) {
            currentStage = Stage.VOTING;
        } else if (currentStage == Stage.VOTING) {
            currentStage = Stage.COUNTING;
        } else if (currentStage == Stage.COUNTING) {
            currentStage = Stage.FINALIZED;
            proposalPassed = yesVotes > noVotes;
            emit Finalized(proposalPassed);
        }
        
        emit StageChanged(oldStage, currentStage);
    }

    // ❌ VULNERABILITY 5: Admin can reset stage, breaking state machine invariants
    function resetToRegistration() external {
        require(msg.sender == admin, "only admin");
        Stage oldStage = currentStage;
        currentStage = Stage.REGISTRATION;
        emit StageChanged(oldStage, currentStage);
    }

    // Helper for attackers to increment vote counts
    function recordVote(uint256 choice) external {
        require(currentStage == Stage.VOTING, "not voting stage");
        require(registered[msg.sender], "not registered");
        
        if (choice == 1) {
            yesVotes++;
        } else {
            noVotes++;
        }
    }
}

// ====================================================================
// Contract 3: TimedAuction
// ====================================================================
/*
 * TimedAuction
 * - Auction goes through stages: BIDDING -> REVEALING -> CLAIMING
 * - Stage transitions depend on time and external calls
 * - Vulnerabilities:
 *   1. Time-based transitions can be manipulated by miners
 *   2. No validation that previous stage completed correctly
 *   3. Winner can be changed during transition periods
 *   4. Funds can be stuck if transitions fail
 */
contract TimedAuction {
    enum Stage { BIDDING, REVEALING, CLAIMING, ENDED }
    
    Stage public currentStage;
    uint256 public biddingEnd;
    uint256 public revealEnd;
    
    address public highestBidder;
    uint256 public highestBid;
    
    mapping(address => bytes32) public commitments; // commitment = keccak256(bid, secret)
    mapping(address => uint256) public bids;
    
    event CommitmentMade(address indexed bidder, bytes32 commitment);
    event BidRevealed(address indexed bidder, uint256 bid);
    event StageAdvanced(Stage indexed newStage);
    event AuctionEnded(address indexed winner, uint256 amount);

    constructor(uint256 biddingTime, uint256 revealTime) {
        currentStage = Stage.BIDDING;
        biddingEnd = block.timestamp + biddingTime;
        revealEnd = biddingEnd + revealTime;
    }

    // ❌ VULNERABILITY 1: Commitment made but stage transition can happen mid-transaction
    function commitBid(bytes32 commitment) external payable {
        require(currentStage == Stage.BIDDING, "not bidding stage");
        require(block.timestamp < biddingEnd, "bidding ended");
        require(msg.value > 0, "zero bid");
        
        commitments[msg.sender] = commitment;
        emit CommitmentMade(msg.sender, commitment);
    }

    // ❌ VULNERABILITY 2: Stage transition depends on time but no validation
    // Miner can manipulate timestamp to prevent/force transitions
    function advanceToRevealing() external {
        require(currentStage == Stage.BIDDING, "not bidding stage");
        require(block.timestamp >= biddingEnd, "bidding not ended");
        
        currentStage = Stage.REVEALING;
        emit StageAdvanced(Stage.REVEALING);
    }

    // ❌ VULNERABILITY 3: Reveal depends on correct commitment but no timeout enforcement
    function revealBid(uint256 bid, uint256 secret) external {
        require(currentStage == Stage.REVEALING, "not revealing stage");
        require(block.timestamp < revealEnd, "reveal ended");
        
        bytes32 commitment = keccak256(abi.encodePacked(bid, secret));
        require(commitments[msg.sender] == commitment, "invalid reveal");
        
        bids[msg.sender] = bid;
        
        // ❌ VULNERABILITY 4: No validation that bid amount was actually sent
        // Attacker can reveal higher bid than they paid
        if (bid > highestBid) {
            highestBidder = msg.sender;
            highestBid = bid;
        }
        
        emit BidRevealed(msg.sender, bid);
    }

    // ❌ VULNERABILITY 5: Transition to claiming doesn't validate reveals completed
    function advanceToClaiming() external {
        require(currentStage == Stage.REVEALING, "not revealing stage");
        require(block.timestamp >= revealEnd, "reveal not ended");
        
        currentStage = Stage.CLAIMING;
        emit StageAdvanced(Stage.CLAIMING);
    }

    // ❌ VULNERABILITY 6: Winner can claim without proper validation
    function claimWin() external {
        require(currentStage == Stage.CLAIMING, "not claiming stage");
        require(msg.sender == highestBidder, "not winner");
        
        uint256 amount = highestBid;
        highestBid = 0;
        
        // ❌ VULNERABILITY 7: No checks-effects-interactions pattern
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        
        currentStage = Stage.ENDED;
        emit AuctionEnded(msg.sender, amount);
    }
}

// ====================================================================
// Contract 4: StateMachineDependencySystem
// ====================================================================
/*
 * System contract that integrates all vulnerable state machines
 * Demonstrates how state machine dependencies can cascade failures
 */
contract StateMachineDependencySystem {
    FragileEscrow public escrow;
    MultiStageVoting public voting;
    TimedAuction public auction;
    
    bool public systemHealthy;
    uint256 public failureCount;
    
    event SystemDeployed(address escrow, address voting, address auction);
    event SystemFailure(string reason, uint256 failureCount);
    event HealthCheck(bool healthy);

    constructor(address processor, uint256 biddingTime, uint256 revealTime) {
        escrow = new FragileEscrow(processor);
        voting = new MultiStageVoting();
        auction = new TimedAuction(biddingTime, revealTime);
        
        systemHealthy = true;
        failureCount = 0;
        
        emit SystemDeployed(address(escrow), address(voting), address(auction));
    }

    // Check if any state machines are in inconsistent states
    function checkHealth() external {
        bool escrowHealthy = address(escrow).balance >= 0; // Simplified check
        bool votingHealthy = uint256(voting.currentStage()) <= 3;
        bool auctionHealthy = uint256(auction.currentStage()) <= 3;
        
        systemHealthy = escrowHealthy && votingHealthy && auctionHealthy;
        emit HealthCheck(systemHealthy);
    }

    // Record system failures from state machine issues
    function recordFailure(string memory reason) external {
        failureCount++;
        systemHealthy = false;
        emit SystemFailure(reason, failureCount);
    }

    // Emergency function to attempt recovery (incomplete and vulnerable)
    function emergencyReset() external {
        // ❌ This doesn't actually fix the underlying state machine issues
        systemHealthy = true;
        failureCount = 0;
    }
}
