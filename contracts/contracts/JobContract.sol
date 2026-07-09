// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Escrow.sol";
import "./Milestone.sol";
import "./Dispute.sol";
import "./Review.sol";

/**
 * @title JobContract
 * @dev Represents a single engagement contract between a client and a freelancer.
 * Designed to be deployed as a minimal proxy clone.
 */
contract JobContract is Initializable, ReentrancyGuard {

    enum JobStatus { Active, Completed, Terminated, InDispute }

    bytes32 public jobId;
    address public client;
    address public freelancer;
    address public paymentToken; // Address(0) for native currency
    uint256 public totalBudget;
    JobStatus public status;

    // References to core contracts
    Escrow public escrowContract;
    Milestone public milestoneContract;
    Dispute public disputeContract;
    Review public reviewContract;

    // Events
    event JobInitialized(bytes32 indexed jobId, address indexed client, address indexed freelancer, uint256 totalBudget);
    event JobCompleted(bytes32 indexed jobId);
    event JobTerminated(bytes32 indexed jobId);
    event JobDisputed(bytes32 indexed jobId);
    event JobDisputeSettled(bytes32 indexed jobId);

    modifier onlyClient() {
        require(msg.sender == client, "JobContract: Only client can call");
        _;
    }

    modifier onlyFreelancer() {
        require(msg.sender == freelancer, "JobContract: Only freelancer can call");
        _;
    }

    modifier onlyParties() {
        require(msg.sender == client || msg.sender == freelancer, "JobContract: Only client or freelancer can call");
        _;
    }

    /**
     * @dev Initialize function replaces constructor to support clone deployments.
     */
    function initialize(
        bytes32 _jobId,
        address _client,
        address _freelancer,
        address _paymentToken,
        uint256 _totalBudget,
        address _escrow,
        address _milestone,
        address _dispute,
        address _review
    ) external initializer {
        require(_client != address(0), "JobContract: Invalid client address");
        require(_freelancer != address(0), "JobContract: Invalid freelancer address");
        require(_client != _freelancer, "JobContract: Client cannot be freelancer");
        require(_escrow != address(0), "JobContract: Invalid escrow address");
        require(_milestone != address(0), "JobContract: Invalid milestone address");
        require(_dispute != address(0), "JobContract: Invalid dispute address");
        require(_review != address(0), "JobContract: Invalid review address");

        jobId = _jobId;
        client = _client;
        freelancer = _freelancer;
        paymentToken = _paymentToken;
        totalBudget = _totalBudget;

        escrowContract = Escrow(_escrow);
        milestoneContract = Milestone(_milestone);
        disputeContract = Dispute(_dispute);
        reviewContract = Review(_review);

        status = JobStatus.Active;

        emit JobInitialized(_jobId, _client, _freelancer, _totalBudget);
    }

    /**
     * @dev Configures a milestone.
     */
    function addMilestone(
        string calldata title,
        uint256 budget,
        uint256 deadline
    ) external onlyClient returns (uint256) {
        require(status == JobStatus.Active, "JobContract: Job is not active");
        return milestoneContract.createMilestone(jobId, title, budget, deadline);
    }

    /**
     * @dev Client registers/funds a milestone.
     */
    function setupEscrowAndFund(
        uint256 milestoneIndex
    ) external payable onlyClient nonReentrant {
        require(status == JobStatus.Active, "JobContract: Job is not active");
        
        (, uint256 budget, , , , Milestone.MilestoneState mState, ) = milestoneContract.getMilestone(jobId, milestoneIndex);
        require(mState == Milestone.MilestoneState.Pending || mState == Milestone.MilestoneState.Rejected, "JobContract: Milestone already funded or approved");

        // Create escrow entry if first funding
        try escrowContract.createEscrow(jobId, client, freelancer, paymentToken, totalBudget) {} catch {}

        // Fund escrow
        if (paymentToken == address(0)) {
            require(msg.value == budget, "JobContract: Sent value does not match budget");
            escrowContract.fundEscrow{value: budget}(jobId);
        } else {
            require(msg.value == 0, "JobContract: Native currency not expected");
            escrowContract.fundEscrow(jobId);
        }

        // Update milestone status to Funded
        milestoneContract.fundMilestone(jobId, milestoneIndex);
    }

    /**
     * @dev Freelancer submits completed work for review.
     */
    function submitWork(
        uint256 milestoneIndex,
        string calldata ipfsHash
    ) external onlyFreelancer {
        require(status == JobStatus.Active, "JobContract: Job is not active");
        milestoneContract.submitWork(jobId, milestoneIndex, ipfsHash);
    }

    /**
     * @dev Client requests revision / rejects submitted work.
     */
    function requestChanges(
        uint256 milestoneIndex,
        string calldata feedback
    ) external onlyClient {
        require(status == JobStatus.Active, "JobContract: Job is not active");
        milestoneContract.rejectMilestone(jobId, milestoneIndex, feedback);
    }

    /**
     * @dev Client approves milestone work and triggers payment release from escrow.
     */
    function approveAndRelease(
        uint256 milestoneIndex
    ) external onlyClient nonReentrant {
        require(status == JobStatus.Active, "JobContract: Job is not active");

        (, uint256 budget, , , , , ) = milestoneContract.getMilestone(jobId, milestoneIndex);

        // Approve milestone state
        milestoneContract.approveMilestone(jobId, milestoneIndex);

        // Release escrow funds
        escrowContract.releaseFunds(jobId, budget);

        // Check if all milestones are approved, then complete job
        uint256 count = milestoneContract.milestoneCounts(jobId);
        bool allApproved = true;
        for (uint256 i = 0; i < count; i++) {
            (, , , , , Milestone.MilestoneState mState, ) = milestoneContract.getMilestone(jobId, i);
            if (mState != Milestone.MilestoneState.Approved) {
                allApproved = false;
                break;
            }
        }

        if (allApproved) {
            status = JobStatus.Completed;
            emit JobCompleted(jobId);
        }
    }

    /**
     * @dev Either party escalates the contract to a dispute.
     */
    function initiateDispute() external onlyParties {
        require(status == JobStatus.Active, "JobContract: Job cannot enter dispute");
        status = JobStatus.InDispute;

        // Escrow dispute flag
        escrowContract.disputeEscrow(jobId);

        // Register dispute logs
        (, , , uint256 released, , ) = escrowContract.escrows(jobId);
        uint256 remaining = totalBudget - released;
        disputeContract.raiseDispute(jobId, client, freelancer, remaining);

        emit JobDisputed(jobId);
    }

    /**
     * @dev Settles the dispute and distributes the split.
     * Can only be triggered when dispute is marked Succeeded/Resolved in the Dispute contract.
     */
    function settleDispute() external nonReentrant {
        require(status == JobStatus.InDispute, "JobContract: Job not in dispute");

        (, , , , Dispute.DisputeState dState, , , uint256 freelancerShare, uint256 clientShare) = disputeContract.disputes(jobId);
        require(dState == Dispute.DisputeState.Resolved, "JobContract: Dispute not resolved by mediators yet");

        status = JobStatus.Completed;

        // Trigger Escrow to resolve the dispute and distribute funds
        escrowContract.resolveDispute(jobId, freelancerShare, clientShare);

        emit JobDisputeSettled(jobId);
    }

    /**
     * @dev Allows both parties to submit reviews once the job is completed.
     */
    function submitReview(
        uint8 overallRating,
        uint8 communicationRating,
        uint8 skillRating,
        uint8 timelinessRating,
        string calldata comment
    ) external onlyParties {
        require(status == JobStatus.Completed || status == JobStatus.Terminated, "JobContract: Job must be closed to review");
        
        address reviewee = (msg.sender == client) ? freelancer : client;
        reviewContract.submitReview(
            jobId,
            msg.sender,
            reviewee,
            overallRating,
            communicationRating,
            skillRating,
            timelinessRating,
            comment
        );
    }
}
