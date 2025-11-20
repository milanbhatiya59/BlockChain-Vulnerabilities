// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
 DemoSemanticDrift_Fixed.sol

 - Reimplements the same features but uses single internal update functions
   to keep all related state updated atomically.
 - Adds a debug `assertInvariant` function that can be called in tests to
   detect drift early (in production, assert() reverts on failure).
*/

contract DemoSemanticDrift_Fixed {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;

    constructor() {
        balances[msg.sender] = 1000 ether;
        totalDeposits = 1000 ether;
    }

    // Internal atomic update helpers
    function _increaseBalance(address who, uint256 amount) internal {
        balances[who] += amount;
        totalDeposits += amount;
    }

    function _decreaseBalance(address who, uint256 amount) internal {
        balances[who] -= amount;
        totalDeposits -= amount;
    }

    // Safe deposit: uses atomic helper
    function deposit() external payable {
        require(msg.value > 0, "zero");
        _increaseBalance(msg.sender, msg.value);
        emit Deposited(msg.sender, msg.value);
    }

    // Safe withdraw: uses atomic helper
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        _decreaseBalance(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    // Admin reward uses same helper
    function adminReward(address to, uint256 amount) external {
        // NOTE: add proper access control in real deployments
        _increaseBalance(to, amount);
        emit Rewarded(to, amount);
    }

    // Fixed helper: updates both balance and totalDeposits atomically
    function _deductFee(address from, uint256 fee) internal {
        if (fee == 0) return;
        require(balances[from] >= fee, "insufficient for fee");
        _decreaseBalance(from, fee);
        emit FeeDeducted(from, fee);
    }

    // transferWithFee uses fixed helper, keeping global invariant intact
    function transferWithFee(address to, uint256 amount, uint256 fee) external {
        require(balances[msg.sender] >= amount + fee, "insufficient");
        // transfer part
        balances[msg.sender] -= amount;
        balances[to] += amount;
        // No change to totalDeposits for net transfer (internal movement)

        // Deduct fee atomically (this will change totalDeposits too)
        _deductFee(msg.sender, fee);

        emit TransferWithFee(msg.sender, to, amount, fee);
    }

    // Debug invariant - in tests call for small address sets only
    function assertInvariant(address[] calldata addrs) external view returns (bool) {
        // For demo: compare partial sum to totalDeposits for passed addresses.
        // In real test environment, you would compute a full invariant via tooling, not on-chain.
        uint256 s = 0;
        for (uint i = 0; i < addrs.length; i++) {
            s += balances[addrs[i]];
        }
        // returns true if partial sum <= totalDeposits (simple sanity check)
        return s <= totalDeposits;
    }

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);
    event Rewarded(address indexed who, uint256 amount);
    event FeeDeducted(address indexed who, uint256 fee);
    event TransferWithFee(address indexed from, address indexed to, uint256 amount, uint256 fee);
}