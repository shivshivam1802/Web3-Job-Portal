// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title Governance
 * @dev Simple DAO proposal and voting mechanism for modifying platform parameters.
 */
contract Governance is Ownable2Step {

    enum ProposalState { Pending, Active, Succeeded, Defeated, Executed }

    struct Proposal {
        uint256 id;
        address proposer;
        address targetContract;
        bytes transactionData;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        ProposalState state;
    }

    // List of proposals
    Proposal[] public proposals;

    // Proposal ID => Voter => Has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Mapping to track voters who are authorized (e.g., shareholders, delegates, or mediators)
    mapping(address => bool) public isVoter;

    // Voting duration in blocks (approx 1 day at 12s blocks = 7200 blocks)
    uint256 public votingPeriodBlocks;

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address target, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);
    event VoterStatusUpdated(address indexed voter, bool status);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    constructor(address _initialOwner, uint256 _votingPeriodBlocks) Ownable(_initialOwner) {
        votingPeriodBlocks = _votingPeriodBlocks;
        isVoter[_initialOwner] = true;
    }

    function setVotingPeriod(uint256 _votingPeriodBlocks) external onlyOwner {
        emit VotingPeriodUpdated(votingPeriodBlocks, _votingPeriodBlocks);
        votingPeriodBlocks = _votingPeriodBlocks;
    }

    function updateVoterStatus(address voter, bool status) external onlyOwner {
        require(voter != address(0), "Governance: Invalid voter address");
        isVoter[voter] = status;
        emit VoterStatusUpdated(voter, status);
    }

    /**
     * @dev Creates a new governance proposal.
     * @param target Address of the contract to call upon execution.
     * @param transactionData Calldata to execute on target.
     * @param description Brief description of the proposal.
     */
    function propose(
        address target,
        bytes calldata transactionData,
        string calldata description
    ) external returns (uint256) {
        require(isVoter[msg.sender], "Governance: Only voters can propose");
        require(target != address(0), "Governance: Target cannot be zero address");

        uint256 proposalId = proposals.length;
        proposals.push(Proposal({
            id: proposalId,
            proposer: msg.sender,
            targetContract: target,
            transactionData: transactionData,
            description: description,
            startBlock: block.number,
            endBlock: block.number + votingPeriodBlocks,
            forVotes: 0,
            againstVotes: 0,
            executed: false,
            state: ProposalState.Active
        }));

        emit ProposalCreated(proposalId, msg.sender, target, description);
        return proposalId;
    }

    /**
     * @dev Casts a vote on a proposal.
     * @param proposalId ID of the proposal.
     * @param support True for YES/FOR, false for NO/AGAINST.
     */
    function castVote(uint256 proposalId, bool support) external {
        require(isVoter[msg.sender], "Governance: Only registered voters can vote");
        require(proposalId < proposals.length, "Governance: Invalid proposal ID");
        
        Proposal storage proposal = proposals[proposalId];
        require(block.number <= proposal.endBlock, "Governance: Voting period has ended");
        require(!hasVoted[proposalId][msg.sender], "Governance: Voter has already voted");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += 1;
        } else {
            proposal.againstVotes += 1;
        }

        emit VoteCast(proposalId, msg.sender, support, 1);
    }

    /**
     * @dev Executes a passed proposal.
     * @param proposalId ID of the proposal.
     */
    function executeProposal(uint256 proposalId) external payable returns (bytes memory) {
        require(proposalId < proposals.length, "Governance: Invalid proposal ID");
        Proposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Governance: Proposal already executed");
        require(block.number > proposal.endBlock, "Governance: Voting period is still active");

        if (proposal.forVotes > proposal.againstVotes) {
            proposal.state = ProposalState.Succeeded;
        } else {
            proposal.state = ProposalState.Defeated;
            revert("Governance: Proposal did not pass");
        }

        proposal.executed = true;
        proposal.state = ProposalState.Executed;

        (bool success, bytes memory returnData) = proposal.targetContract.call{value: msg.value}(
            proposal.transactionData
        );
        require(success, "Governance: Transaction execution failed");

        emit ProposalExecuted(proposalId);
        return returnData;
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }
}
