// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./JobContract.sol";

/**
 * @title JobFactory
 * @dev Factory contract to deploy individual client-freelancer JobContract instances via minimal proxy clones.
 */
contract JobFactory is Ownable2Step, Pausable {

    // Master implementation of JobContract
    address public jobContractImplementation;

    // Core global dependencies
    address public escrow;
    address public milestone;
    address public dispute;
    address public review;

    // Registry of all deployed jobs: index => job address
    address[] public allJobs;
    // Map to check if an address was deployed by this factory
    mapping(address => bool) public isDeployedJob;

    // Events
    event JobCreated(
        bytes32 indexed jobId,
        address indexed jobAddress,
        address indexed client,
        address freelancer,
        uint256 budget,
        address token
    );
    event ImplementationUpdated(address indexed oldImp, address indexed newImp);
    event DependenciesUpdated(address escrow, address milestone, address dispute, address review);

    constructor(
        address _initialOwner,
        address _jobImplementation,
        address _escrow,
        address _milestone,
        address _dispute,
        address _review
    ) Ownable(_initialOwner) {
        require(_jobImplementation != address(0), "JobFactory: Invalid implementation address");
        require(_escrow != address(0), "JobFactory: Invalid escrow address");
        require(_milestone != address(0), "JobFactory: Invalid milestone address");
        require(_dispute != address(0), "JobFactory: Invalid dispute address");
        require(_review != address(0), "JobFactory: Invalid review address");

        jobContractImplementation = _jobImplementation;
        escrow = _escrow;
        milestone = _milestone;
        dispute = _dispute;
        review = _review;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function updateImplementation(address _jobImplementation) external onlyOwner {
        require(_jobImplementation != address(0), "JobFactory: Invalid implementation address");
        emit ImplementationUpdated(jobContractImplementation, _jobImplementation);
        jobContractImplementation = _jobImplementation;
    }

    function updateDependencies(
        address _escrow,
        address _milestone,
        address _dispute,
        address _review
    ) external onlyOwner {
        require(_escrow != address(0), "JobFactory: Invalid escrow address");
        require(_milestone != address(0), "JobFactory: Invalid milestone address");
        require(_dispute != address(0), "JobFactory: Invalid dispute address");
        require(_review != address(0), "JobFactory: Invalid review address");

        escrow = _escrow;
        milestone = _milestone;
        dispute = _dispute;
        review = _review;

        emit DependenciesUpdated(_escrow, _milestone, _dispute, _review);
    }

    /**
     * @dev Deploys a new JobContract proxy instance.
     */
    function createJob(
        bytes32 jobId,
        address freelancer,
        address token,
        uint256 budget
    ) external whenNotPaused returns (address) {
        require(freelancer != address(0), "JobFactory: Invalid freelancer address");
        require(msg.sender != freelancer, "JobFactory: Client cannot be freelancer");
        require(budget > 0, "JobFactory: Budget must be greater than zero");

        address clone = Clones.clone(jobContractImplementation);
        
        JobContract(clone).initialize(
            jobId,
            msg.sender, // Client is the caller
            freelancer,
            token,
            budget,
            escrow,
            milestone,
            dispute,
            review
        );

        allJobs.push(clone);
        isDeployedJob[clone] = true;

        emit JobCreated(jobId, clone, msg.sender, freelancer, budget, token);
        return clone;
    }

    function getJobCount() external view returns (uint256) {
        return allJobs.length;
    }
}
