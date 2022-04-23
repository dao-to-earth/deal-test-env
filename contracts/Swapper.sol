// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./ISwapper.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Swapper is ISwapper {
    using Counters for Counters.Counter;
    Counters.Counter private _dealId;

    // TODO: refacto this ugly struct
    // deal_id => pair of Offer()
    struct Deal {
        address account1;
        address account2;
        address token1;
        address token2;
        uint256 amount1;
        uint256 amount2;
        uint256 startDate;
        uint256 vesting;
        Status status;
    }
    mapping(uint256 => Deal) private _deals;

    mapping(address => mapping(address => uint256)) private _balances;

    function propose(
        address token1, 
        uint256 amount1, 
        address receiver, 
        address token2, 
        uint256 amount2, 
        uint256 vesting
    ) external override returns(bool, uint256) {
       
        // Transfer tokens to contract
        _transfer(msg.sender, token1, amount1);
        
        // Save new Deal
        uint256 id = _dealId.current();
        _deals[id] = Deal({
            account1: msg.sender, 
            account2: receiver,
            token1: token1,
            token2: token2,
            amount1: amount1,
            amount2: amount2,
            vesting: vesting,
            startDate: block.number,
            status: Status.Pending
        });
        _dealId.increment();

        emit DealCreated(msg.sender, token1, amount1, receiver, token2, amount2, vesting);

        return (true, id);
    }

    function approve(uint256 id) external override returns (bool) {
        Deal storage deal = _deals[id];
        // requires that msg.sender is receiver Deal
        require(msg.sender == deal.account2, "Swapper: caller not allowed");

        // Transfer tokens to contract
        _transfer(msg.sender, deal.token2, deal.amount2);
        
        // updates Deal status to Approved
        deal.status = Status.Approved;

        emit DealApproved(id, msg.sender);

        return true;
    }

    function claim(uint256 id) external override returns (bool) {
        Deal storage deal = _deals[id];
        
        // require caller is either account1 or account2
        require((deal.account1 == msg.sender) || (deal.account2 == msg.sender), "Swapper: caller is not stakeholder");
        
        // require vesting period has been reached
        require(deal.startDate + deal.vesting >= block.number, "Swapper: vesting period is not over");
        
        // send tokens to both stakeholder
        IERC20(deal.token1).transfer(deal.account2, deal.amount1);
        IERC20(deal.token2).transfer(deal.account1, deal.amount2);

        // update deal status to claimed
        deal.status = Status.Claimed;
        
        // emit event
        emit DealClaimed(id, msg.sender);
        
        return true;
    }

    function _transfer(address account, address token, uint256 amount) private {
        uint256 allowance = IERC20(token).allowance(account, address(this));
        require(allowance >= amount, "Swapper: needs allowance");
        
        bool success = IERC20(token).transferFrom(account, address(this), amount);
        require(success, "Swapper: token transfer has failed");

        _balances[account][token] = amount;
    }
}