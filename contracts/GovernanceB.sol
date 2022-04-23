// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";

contract GovernanceB is Governor, GovernorCountingSimple, GovernorVotes {
    constructor(IVotes _token) Governor("GovernorA") GovernorVotes(_token) {}

    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block
    }

    function votingPeriod() public pure override returns (uint256) {
        return 3; // 1 week
    }

    function quorum(uint256 blockNumber) public pure override returns (uint256) {
        return 1e18;
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 1e18;
    }

    // The following functions are overrides required by Solidity.

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotes)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }
}
