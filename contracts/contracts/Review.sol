// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Review
 * @dev Manages ratings (1-5 stars) for communication, skill, timeliness, and general comments between clients and freelancers.
 */
contract Review is Ownable2Step, Pausable {

    struct ReviewDetails {
        address reviewer;
        address reviewee;
        bytes32 jobId;
        uint8 overallRating;      // 1 to 5
        uint8 communicationRating; // 1 to 5
        uint8 skillRating;         // 1 to 5 (only relevant for freelancers)
        uint8 timelinessRating;    // 1 to 5
        string comment;
        uint256 timestamp;
    }

    // Mapping from Job/Contract ID => Reviewer => ReviewDetails
    mapping(bytes32 => mapping(address => ReviewDetails)) public reviews;

    // Mapping from user address => running totals for averages
    struct UserRatingStats {
        uint256 totalRatingScore;
        uint256 reviewCount;
    }
    mapping(address => UserRatingStats) public userStats;

    // Mapping to track authorized job contracts (can trigger review submissions)
    mapping(address => bool) public authorizedCallers;

    // Events
    event ReviewSubmitted(
        bytes32 indexed jobId,
        address indexed reviewer,
        address indexed reviewee,
        uint8 overallRating,
        string comment
    );
    event CallerAuthorizationUpdated(address indexed caller, bool isAuthorized);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Review: Unauthorized caller");
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
        require(caller != address(0), "Review: Invalid caller address");
        authorizedCallers[caller] = isAuthorized;
        emit CallerAuthorizationUpdated(caller, isAuthorized);
    }

    /**
     * @dev Submits a review for a completed job.
     */
    function submitReview(
        bytes32 jobId,
        address reviewer,
        address reviewee,
        uint8 overallRating,
        uint8 communicationRating,
        uint8 skillRating,
        uint8 timelinessRating,
        string calldata comment
    ) external onlyAuthorized whenNotPaused {
        require(reviews[jobId][reviewer].reviewer == address(0), "Review: Already reviewed for this job");
        require(reviewer != address(0) && reviewee != address(0), "Review: Invalid user addresses");
        require(
            overallRating >= 1 && overallRating <= 5 &&
            communicationRating >= 1 && communicationRating <= 5 &&
            skillRating >= 1 && skillRating <= 5 &&
            timelinessRating >= 1 && timelinessRating <= 5,
            "Review: Ratings must be between 1 and 5"
        );

        reviews[jobId][reviewer] = ReviewDetails({
            reviewer: reviewer,
            reviewee: reviewee,
            jobId: jobId,
            overallRating: overallRating,
            communicationRating: communicationRating,
            skillRating: skillRating,
            timelinessRating: timelinessRating,
            comment: comment,
            timestamp: block.timestamp
        });

        // Update running averages
        UserRatingStats storage stats = userStats[reviewee];
        stats.totalRatingScore += overallRating;
        stats.reviewCount += 1;

        emit ReviewSubmitted(jobId, reviewer, reviewee, overallRating, comment);
    }

    /**
     * @dev Helper view to get average rating for a user.
     * Returns rating multiplied by 100 for precision (e.g. 4.5 average returns 450).
     */
    function getAverageRating(address user) external view returns (uint256 averageRating, uint256 reviewCount) {
        UserRatingStats memory stats = userStats[user];
        if (stats.reviewCount == 0) {
            return (0, 0);
        }
        return ((stats.totalRatingScore * 100) / stats.reviewCount, stats.reviewCount);
    }
}
