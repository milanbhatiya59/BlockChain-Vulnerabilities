// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InconsistentStateToken
 * @notice Demonstrates inconsistent state updates where multiple state variables
 * represent the same logical value but are updated inconsistently
 * 
 * VULNERABILITY: Functions update balances[] but forget to update totalSupply,
 * breaking the invariant: sum(balances) == totalSupply
 */
contract InconsistentStateToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event RescueCredit(address indexed to, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event InvariantViolation(uint256 expectedSupply, uint256 actualSupply);
    
    constructor() {
        // Initial supply assigned to deployer
        balances[msg.sender] = 1000 ether;
        totalSupply = 1000 ether;
    }
    
    // ✅ CORRECT: Updates both balances and totalSupply
    function mint(address to, uint256 amount) public {
        balances[to] += amount;
        totalSupply += amount;
        emit Mint(to, amount);
    }
    
    // ❌ VULNERABILITY 1: Credits user but forgets to update totalSupply
    // This breaks the invariant: sum(balances) > totalSupply
    function rescueCredit(address to, uint256 amount) public {
        // Intended as a utility to credit users, but developer forgot totalSupply update
        balances[to] += amount;
        // totalSupply NOT UPDATED -> inconsistent state
        emit RescueCredit(to, amount);
    }
    
    // ✅ CORRECT: Updates both balances and totalSupply
    function burn(uint256 amount) public {
        require(balances[msg.sender] >= amount, "insufficient balance");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
    }
    
    // ❌ VULNERABILITY 2: Transfer without updating totalSupply is correct,
    // but having inconsistent totalSupply from rescueCredit causes issues
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
    }
    
    // View helper to detect invariant violation
    function getInvariantViolation() public view returns (bool violated, uint256 expected, uint256 actual) {
        // In production, calculating sum of all balances is impossible
        // This is just for demonstration
        actual = totalSupply;
        expected = 0; // Would be sum of all balances in real scenario
        violated = false; // Simplified for demo
    }
}

/**
 * @title InconsistentVault
 * @notice Vault that tracks deposits in two ways: individual deposits[] and totalDeposits
 * Some withdrawal paths forget to update totalDeposits
 */
contract InconsistentVault {
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    uint256 public emergencyWithdrawals;
    
    event Deposit(address indexed user, uint256 amount, uint256 newTotal);
    event Withdraw(address indexed user, uint256 amount, uint256 newTotal);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event StateInconsistency(uint256 sumDeposits, uint256 totalDeposits);
    
    // ✅ CORRECT: Updates both deposits and totalDeposits
    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value, totalDeposits);
    }
    
    // ✅ CORRECT: Updates both deposits and totalDeposits
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "insufficient deposit");
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
        
        emit Withdraw(msg.sender, amount, totalDeposits);
    }
    
    // ❌ VULNERABILITY 3: Emergency withdrawal forgets to update totalDeposits
    function emergencyWithdraw() external {
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "no deposits");
        
        deposits[msg.sender] = 0;
        emergencyWithdrawals += amount;
        // totalDeposits NOT UPDATED -> inconsistent state
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
        
        emit EmergencyWithdraw(msg.sender, amount);
    }
    
    // ❌ VULNERABILITY 4: Admin rescue forgets to update deposits
    function adminRescue(address user, uint256 amount) external {
        require(totalDeposits >= amount, "insufficient total");
        totalDeposits -= amount;
        // deposits[user] NOT UPDATED -> inconsistent state
        
        (bool success, ) = user.call{value: amount}("");
        require(success, "transfer failed");
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title InconsistentRewardPool
 * @notice Reward pool that maintains rewardBalance and rewardDebt separately
 * Some functions update one but not the other
 */
contract InconsistentRewardPool {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewardDebt;
    uint256 public totalStaked;
    uint256 public rewardBalance;
    uint256 public rewardPerToken;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardAdded(uint256 amount);
    event StateCorrupted(string reason);
    
    // ✅ CORRECT: Updates both stakes and totalStaked
    function stake() external payable {
        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;
        rewardDebt[msg.sender] = stakes[msg.sender] * rewardPerToken / 1e18;
        emit Staked(msg.sender, msg.value);
    }
    
    // ✅ CORRECT: Updates both stakes and totalStaked
    function unstake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "insufficient stake");
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    // ❌ VULNERABILITY 5: Adds rewards but forgets to update rewardPerToken
    function addReward() external payable {
        rewardBalance += msg.value;
        // rewardPerToken NOT UPDATED -> users can't claim fair share
        emit RewardAdded(msg.value);
    }
    
    // ❌ VULNERABILITY 6: Claims rewards but calculations are wrong due to inconsistent state
    function claimReward() external {
        uint256 earned = stakes[msg.sender] * rewardPerToken / 1e18 - rewardDebt[msg.sender];
        require(earned > 0, "no rewards");
        require(rewardBalance >= earned, "insufficient rewards");
        
        rewardDebt[msg.sender] += earned;
        rewardBalance -= earned;
        
        (bool success, ) = msg.sender.call{value: earned}("");
        require(success, "transfer failed");
        
        emit RewardClaimed(msg.sender, earned);
    }
    
    // ❌ VULNERABILITY 7: Emergency distribution without proper state update
    function emergencyDistribute(address[] memory users, uint256[] memory amounts) external {
        require(users.length == amounts.length, "length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(rewardBalance >= totalAmount, "insufficient rewards");
        
        for (uint256 i = 0; i < users.length; i++) {
            (bool success, ) = users[i].call{value: amounts[i]}("");
            require(success, "transfer failed");
        }
        
        // rewardBalance NOT UPDATED -> inconsistent state
        emit StateCorrupted("Emergency distribution without state update");
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title StateCorruptionSystem
 * @notice System that demonstrates cascading state corruption
 */
contract StateCorruptionSystem {
    InconsistentStateToken public token;
    InconsistentVault public vault;
    InconsistentRewardPool public rewardPool;
    
    uint256 public systemTotalValue;
    bool public systemHealthy;
    
    event SystemDeployed(address token, address vault, address rewardPool);
    event SystemCorrupted(string reason);
    event HealthCheck(bool healthy, uint256 discrepancy);
    
    constructor() {
        token = new InconsistentStateToken();
        vault = new InconsistentVault();
        rewardPool = new InconsistentRewardPool();
        systemHealthy = true;
        
        emit SystemDeployed(address(token), address(vault), address(rewardPool));
    }
    
    // ❌ VULNERABILITY 8: Health check uses inconsistent state
    function checkSystemHealth() external returns (bool) {
        uint256 tokenValue = token.totalSupply();
        uint256 vaultValue = vault.totalDeposits();
        uint256 poolValue = rewardPool.totalStaked();
        
        uint256 calculatedTotal = tokenValue + vaultValue + poolValue;
        
        if (calculatedTotal != systemTotalValue) {
            systemHealthy = false;
            emit SystemCorrupted("System state mismatch");
            emit HealthCheck(false, calculatedTotal > systemTotalValue ? 
                calculatedTotal - systemTotalValue : 
                systemTotalValue - calculatedTotal);
        }
        
        return systemHealthy;
    }
    
    function updateSystemValue(uint256 newValue) external {
        systemTotalValue = newValue;
    }
}
