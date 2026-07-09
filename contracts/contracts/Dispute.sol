// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Dispute
 * @dev Manages dispute logs, mediator lists, evidence uploads, voting details, and resolutions.
 */
contract Dispute is Ownable2Step, Pausable {

    enum DisputeState { Initiated, Voting, Resolved, Dismissed }

    struct DisputeInfo {
        bytes32 jobId;
        address client;
        address freelancer;
        uint256 remainingBudget;
        DisputeState state;
        address primaryMediator; // Central mediator if applicable
        uint256 voteCount;
        uint256 freelancerProposedRelease;
        uint256 clientProposedRefund;
    }

    struct Evidence {
        address submitter;
        string ipfsHash;
        uint256 timestamp;
    }

    // Mapping from Job/Contract ID => Dispute Details
    mapping(bytes32 => DisputeInfo) public disputes;

    // Mapping from Job/Contract ID => List of Evidence submitted
    mapping(bytes32 => Evidence[]) public evidences;

    // Mapping from Job/Contract ID => Mediator => Voted status
    mapping(bytes32 => mapping(address => bool)) public hasVoted;

    // Mapping to track authorized mediators whitelisted by owner
    mapping(address => bool) public isMediator;

    // Mapping to track authorized job contracts (can trigger dispute creation)
    mapping(address => bool) public authorizedCallers;

    // Events
    event DisputeRaised(bytes32 indexed jobId, address indexed client, address indexed freelancer, uint256 remainingBudget);
    event EvidenceSubmitted(bytes32 indexed jobId, address indexed submitter, string ipfsHash);
    event VoteSubmitted(bytes32 indexed jobId, address indexed mediator, uint256 freelancerShare, uint256 clientShare);
    event DisputeResolved(bytes32 indexed jobId, uint256 freelancerShare, uint256 clientShare, address indexed resolver);
    event MediatorStatusUpdated(address indexed mediator, bool status);
    event CallerAuthorizationUpdated(address indexed caller, bool isAuthorized);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Dispute: Unauthorized caller");
        _;
    }

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setAuthorizedCaller(address caller, bool isAuthorized) external onlyOwner {
        require(caller != address(0), "Dispute: Invalid caller address");
        authorizedCallers[caller] = isAuthorized;
        emit CallerAuthorizationUpdated(caller, isAuthorized);
    }

    function updateMediatorStatus(address mediator, bool status) external onlyOwner {
        require(mediator != address(0), "Dispute: Invalid mediator address");
        isMediator[mediator] = status;
        emit MediatorStatusUpdated(mediator, status);
    }

    /**
     * @dev Initiates a new dispute process for a Job.
     */
    function raiseDispute(
        bytes32 jobId,
        address client,
        address freelancer,
        uint256 remainingBudget
    ) external onlyAuthorized whenNotPaused {
        require(disputes[jobId].client == address(0), "Dispute: Already exists for this job");
        require(client != address(0) && freelancer != address(0), "Dispute: Invalid user addresses");

        disputes[jobId] = DisputeInfo({
            jobId: jobId,
            client: client,
            freelancer: freelancer,
            remainingBudget: remainingBudget,
            state: DisputeState.Initiated,
            primaryMediator: address(0),
            voteCount: 0,
            freelancerProposedRelease: 0,
            clientProposedRefund: 0
        });

        emit DisputeRaised(jobId, client, freelancer, remainingBudget);
    }

    /**
     * @dev Submits evidence (IPFS hash link of texts, screenshots, logs).
     * Accessible by client, freelancer, or authorized caller.
     */
    function submitEvidence(
        bytes32 jobId,
        address submitter,
        string calldata ipfsHash
    ) external onlyAuthorized whenNotPaused {
        require(disputes[jobId].client != address(0), "Dispute: Dispute does not exist");
        require(disputes[jobId].state == DisputeState.Initiated || disputes[jobId].state == DisputeState.Voting, "Dispute: Invalid stage");
        require(submitter == disputes[jobId].client || submitter == disputes[jobId].freelancer || isMediator[submitter], "Dispute: Unassociated submitter");

        evidences[jobId].push(Evidence({
            submitter: submitter,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp
        }));

        emit EvidenceSubmitted(jobId, submitter, ipfsHash);
    }

    /**
     * @dev Resolves a dispute directly via owner or single whitelisted primary mediator.
     */
    function resolveDisputeDirectly(
        bytes32 jobId,
        uint256 freelancerShare,
        uint256 clientShare
    ) external whenNotPaused {
        DisputeInfo storage dispute = disputes[jobId];
        require(displayIsValidResolver(msg.sender), "Dispute: Sender not authorized mediator or owner");
        require(dispute.state == DisputeState.Initiated || dispute.state == DisputeState.Voting, "Dispute: Invalid stage");
        require(freelancerShare + clientShare == dispute.remainingBudget, "Dispute: Sum of shares must match remaining budget");

        dispute.state = DisputeState.Resolved;
        dispute.freelancerProposedRelease = freelancerShare;
        dispute.clientProposedRefund = clientShare;
        dispute.primaryMediator = msg.sender;

        emit DisputeResolved(jobId, freelancerShare, clientShare, msg.sender);
    }

    /**
     * @dev Mediator votes on the split of remaining funds.
     */
    function submitMediatorVote(
        bytes32 jobId,
        uint256 freelancerShare,
        uint256 clientShare
    ) external whenNotPaused {
        require(isMediator[msg.sender], "Dispute: Sender is not a whitelisted mediator");
        DisputeInfo storage dispute = disputes[jobId];
        require(dispute.state == DisputeState.Initiated || dispute.state == DisputeState.Voting, "Dispute: Invalid stage");
        require(!hasVoted[jobId][msg.sender], "Dispute: Already voted");
        require(freelancerShare + clientShare == dispute.remainingBudget, "Dispute: Sum of shares must match remaining budget");

        if (dispute.state == DisputeState.Initiated) {
            dispute.state = DisputeState.Voting;
        }

        hasVoted[jobId][msg.sender] = true;
        dispute.voteCount += 1;

        dispute.freelancerProposedRelease = (dispute.freelancerProposedRelease * (dispute.voteCount - 1) + freelancerShare) / dispute.voteCount;
        dispute.clientProposedRefund = (dispute.clientProposedRefund * (dispute.voteCount - 1) + clientShare) / dispute.voteCount;

        emit VoteSubmitted(jobId, msg.sender, freelancerShare, clientShare);

        // Auto-resolve after 3 votes
        if (dispute.voteCount >= 3) {
            dispute.state = DisputeState.Resolved;
            emit DisputeResolved(jobId, dispute.freelancerProposedRelease, dispute.clientProposedRefund, address(this));
        }
    }

    function displayIsValidResolver(address caller) public view returns (bool) {
        return caller == owner() || isMediator[caller];
    }

    function getEvidenceCount(bytes32 jobId) external view returns (uint256) {
        return evidences[jobId].length;
    }
}
