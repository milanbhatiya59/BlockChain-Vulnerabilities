// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EventStateMismatch_Fixed {

    mapping(address => uint256) public balances;

    event DepositLogged(address indexed user, uint256 amount);
    event WithdrawLogged(address indexed user, uint256 amount);

    // ✅ Fix: update state first, then emit event
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit DepositLogged(msg.sender, msg.value);
    }

    // ✅ Fix: emit event ONLY after successful state update
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient");

        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        emit WithdrawLogged(msg.sender, amount);
    }
}