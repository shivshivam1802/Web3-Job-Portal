// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Referral
 * @dev Manages the platform referral program, user connections, and reward claims.
 */
contract Referral is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Mapping from user => referrer address
    mapping(address => address) public referrers;

    // Mapping from referrer => list of referred users
    mapping(address => address[]) public referredUsers;

    // Mapping from user => token => accumulated reward balance
    mapping(address => mapping(address => uint256)) public rewardBalances;

    // Mapping to track authorized caller addresses (like Backend API handler or Job contracts)
    mapping(address => bool) public authorizedCallers;

    // Events
    event ReferralRegistered(address indexed user, address indexed referrer);
    event RewardAccrued(address indexed user, address indexed token, uint256 amount);
    event RewardClaimed(address indexed user, address indexed token, uint256 amount);
    event CallerAuthorizationUpdated(address indexed caller, bool isAuthorized);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Referral: Unauthorized caller");
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
        require(caller != address(0), "Referral: Invalid caller address");
        authorizedCallers[caller] = isAuthorized;
        emit CallerAuthorizationUpdated(caller, isAuthorized);
    }

    /**
     * @dev Registers a referrer for a user.
     * Can only be called once per user, before any rewards accrue.
     */
    function registerReferral(address user, address referrer) external onlyAuthorized whenNotPaused {
        require(user != address(0), "Referral: User cannot be zero address");
        require(referrer != address(0), "Referral: Referrer cannot be zero address");
        require(user != referrer, "Referral: Cannot refer self");
        require(referrers[user] == address(0), "Referral: Already has a referrer");

        referrers[user] = referrer;
        referredUsers[referrer].push(user);

        emit ReferralRegistered(user, referrer);
    }

    /**
     * @dev Accrues rewards for a referrer.
     * @param referrer The address receiving the rewards.
     * @param token Address of the token reward, address(0) for native currency.
     * @param amount The value of the reward.
     */
    function accrueReward(address referrer, address token, uint256 amount) external payable onlyAuthorized whenNotPaused {
        require(referrer != address(0), "Referral: Referrer cannot be zero address");
        require(amount > 0, "Referral: Reward amount must be greater than zero");

        if (token == address(0)) {
            require(msg.value == amount, "Referral: Incorrect native currency sent");
        } else {
            require(msg.value == 0, "Referral: Native value not expected");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        rewardBalances[referrer][token] += amount;
        emit RewardAccrued(referrer, token, amount);
    }

    /**
     * @dev Claims accrued rewards.
     * @param token Address of the token reward, address(0) for native currency.
     */
    function claimReward(address token) external nonReentrant whenNotPaused {
        uint256 balance = rewardBalances[msg.sender][token];
        require(balance > 0, "Referral: No reward balance to claim");

        rewardBalances[msg.sender][token] = 0;

        if (token == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: balance}("");
            require(success, "Referral: Native currency transfer failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, balance);
        }

        emit RewardClaimed(msg.sender, token, balance);
    }

    /**
     * @dev Gets the list of users referred by a referrer.
     */
    function getReferredUsers(address referrer) external view returns (address[] memory) {
        return referredUsers[referrer];
    }
}
