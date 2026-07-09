// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Milestone
 * @dev Manages the creation, funding, work submission, change requests, and approval flow of job milestones.
 */
contract Milestone is Ownable2Step, Pausable {

    enum MilestoneState { Pending, Funded, Submitted, Approved, Rejected }

    struct MilestoneInfo {
        string title;
        uint256 budget;
        uint256 deadline;
        string submissionIpfsHash; // Stores work proof link or details
        string feedback; // Feedback when work is rejected/changes requested
        MilestoneState state;
        uint256 releaseTime;
    }

    // Mapping from Escrow ID / Job ID => Milestone Index => Milestone Details
    mapping(bytes32 => MilestoneInfo[]) public milestones;

    // Mapping from Escrow ID / Job ID => total number of milestones
    mapping(bytes32 => uint256) public milestoneCounts;

    // Mapping to track authorized job contracts (can trigger state edits)
    mapping(address => bool) public authorizedCallers;

    // Events
    event MilestoneCreated(bytes32 indexed jobId, uint256 indexed milestoneIndex, string title, uint256 budget, uint256 deadline);
    event MilestoneFunded(bytes32 indexed jobId, uint256 indexed milestoneIndex);
    event MilestoneSubmitted(bytes32 indexed jobId, uint256 indexed milestoneIndex, string submissionIpfsHash);
    event MilestoneApproved(bytes32 indexed jobId, uint256 indexed milestoneIndex);
    event MilestoneRejected(bytes32 indexed jobId, uint256 indexed milestoneIndex, string feedback);
    event CallerAuthorizationUpdated(address indexed caller, bool isAuthorized);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Milestone: Unauthorized caller");
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
        require(caller != address(0), "Milestone: Invalid caller address");
        authorizedCallers[caller] = isAuthorized;
        emit CallerAuthorizationUpdated(caller, isAuthorized);
    }

    /**
     * @dev Creates a new milestone for a job.
     */
    function createMilestone(
        bytes32 jobId,
        string calldata title,
        uint256 budget,
        uint256 deadline
    ) external onlyAuthorized whenNotPaused returns (uint256) {
        require(budget > 0, "Milestone: Budget must be greater than zero");
        
        uint256 index = milestoneCounts[jobId];
        milestones[jobId].push(MilestoneInfo({
            title: title,
            budget: budget,
            deadline: deadline,
            submissionIpfsHash: "",
            feedback: "",
            state: MilestoneState.Pending,
            releaseTime: 0
        }));
        
        milestoneCounts[jobId] = index + 1;
        emit MilestoneCreated(jobId, index, title, budget, deadline);
        return index;
    }

    /**
     * @dev Marks a milestone as Funded.
     */
    function fundMilestone(bytes32 jobId, uint256 index) external onlyAuthorized whenNotPaused {
        require(index < milestoneCounts[jobId], "Milestone: Invalid index");
        MilestoneInfo storage milestone = milestones[jobId][index];
        require(milestone.state == MilestoneState.Pending || milestone.state == MilestoneState.Rejected, "Milestone: Invalid state to fund");

        milestone.state = MilestoneState.Funded;
        emit MilestoneFunded(jobId, index);
    }

    /**
     * @dev Submits work for a milestone.
     */
    function submitWork(
        bytes32 jobId,
        uint256 index,
        string calldata submissionIpfsHash
    ) external onlyAuthorized whenNotPaused {
        require(index < milestoneCounts[jobId], "Milestone: Invalid index");
        MilestoneInfo storage milestone = milestones[jobId][index];
        require(milestone.state == MilestoneState.Funded || milestone.state == MilestoneState.Rejected, "Milestone: Work cannot be submitted in current state");

        milestone.state = MilestoneState.Submitted;
        milestone.submissionIpfsHash = submissionIpfsHash;
        emit MilestoneSubmitted(jobId, index, submissionIpfsHash);
    }

    /**
     * @dev Approves the work and releases the milestone.
     */
    function approveMilestone(bytes32 jobId, uint256 index) external onlyAuthorized whenNotPaused {
        require(index < milestoneCounts[jobId], "Milestone: Invalid index");
        MilestoneInfo storage milestone = milestones[jobId][index];
        require(milestone.state == MilestoneState.Submitted || milestone.state == MilestoneState.Funded, "Milestone: Work not submitted or not funded");

        milestone.state = MilestoneState.Approved;
        milestone.releaseTime = block.timestamp;
        emit MilestoneApproved(jobId, index);
    }

    /**
     * @dev Rejects/Requests changes for the submitted milestone work.
     */
    function rejectMilestone(bytes32 jobId, uint256 index, string calldata feedback) external onlyAuthorized whenNotPaused {
        require(index < milestoneCounts[jobId], "Milestone: Invalid index");
        MilestoneInfo storage milestone = milestones[jobId][index];
        require(milestone.state == MilestoneState.Submitted, "Milestone: Work not submitted for evaluation");

        milestone.state = MilestoneState.Rejected;
        milestone.feedback = feedback;
        emit MilestoneRejected(jobId, index, feedback);
    }

    /**
     * @dev Returns the full details of a milestone.
     */
    function getMilestone(bytes32 jobId, uint256 index) external view returns (
        string memory title,
        uint256 budget,
        uint256 deadline,
        string memory submissionIpfsHash,
        string memory feedback,
        MilestoneState state,
        uint256 releaseTime
    ) {
        require(index < milestoneCounts[jobId], "Milestone: Invalid index");
        MilestoneInfo memory milestone = milestones[jobId][index];
        return (
            milestone.title,
            milestone.budget,
            milestone.deadline,
            milestone.submissionIpfsHash,
            milestone.feedback,
            milestone.state,
            milestone.releaseTime
        );
    }
}
