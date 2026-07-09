// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Treasury
 * @dev Manages platform fees, accumulated revenue, and security controls for the Web3 Freelance Marketplace.
 */
contract Treasury is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Basis points constant (100% = 10000)
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Maximum allowable platform fee (e.g., 10%)
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000;

    // Platform fee in basis points (default: 2% = 200 bps)
    uint256 public platformFeeBps;

    // Address where platform fees are deposited (treasury wallet)
    address public feeRecipient;

    // Events
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event NativeWithdrawn(address indexed recipient, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed recipient, uint256 amount);

    /**
     * @dev Constructor sets the initial owner, fee recipient, and default platform fee.
     * @param _initialOwner Address of the owner.
     * @param _feeRecipient Address where collected fees should go.
     * @param _platformFeeBps Platform fee in basis points.
     */
    constructor(
        address _initialOwner,
        address _feeRecipient,
        uint256 _platformFeeBps
    ) Ownable(_initialOwner) {
        require(_feeRecipient != address(0), "Treasury: Fee recipient cannot be zero address");
        require(_platformFeeBps <= MAX_PLATFORM_FEE_BPS, "Treasury: Fee exceeds max limit");

        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;
    }

    /**
     * @dev Pauses withdrawals and configuration updates.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Updates the platform fee.
     * @param _platformFeeBps New platform fee in basis points.
     */
    function setPlatformFee(uint256 _platformFeeBps) external onlyOwner whenNotPaused {
        require(_platformFeeBps <= MAX_PLATFORM_FEE_BPS, "Treasury: Fee exceeds max limit");
        emit PlatformFeeUpdated(platformFeeBps, _platformFeeBps);
        platformFeeBps = _platformFeeBps;
    }

    /**
     * @dev Updates the fee recipient address.
     * @param _feeRecipient New fee recipient address.
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner whenNotPaused {
        require(_feeRecipient != address(0), "Treasury: Fee recipient cannot be zero address");
        emit FeeRecipientUpdated(feeRecipient, _feeRecipient);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Helper to calculate platform fee for a given amount.
     * @param amount The transaction amount.
     * @return fee The calculated fee amount.
     * @return remaining The remaining amount after fee deduction.
     */
    function calculateFee(uint256 amount) public view returns (uint256 fee, uint256 remaining) {
        fee = (amount * platformFeeBps) / BPS_DENOMINATOR;
        remaining = amount - fee;
    }

    /**
     * @dev Withdraws native currency (ETH/MATIC/BNB) from the treasury.
     * @param recipient The address to receive the native currency.
     * @param amount The amount of native currency to withdraw.
     */
    function withdrawNative(address payable recipient, uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        require(recipient != address(0), "Treasury: Recipient cannot be zero address");
        require(address(this).balance >= amount, "Treasury: Insufficient native balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Treasury: Native transfer failed");

        emit NativeWithdrawn(recipient, amount);
    }

    /**
     * @dev Withdraws ERC20 tokens from the treasury.
     * @param token The address of the ERC20 token.
     * @param recipient The address to receive the tokens.
     * @param amount The amount of tokens to withdraw.
     */
    function withdrawERC20(address token, address recipient, uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        require(token != address(0), "Treasury: Token cannot be zero address");
        require(recipient != address(0), "Treasury: Recipient cannot be zero address");
        
        IERC20(token).safeTransfer(recipient, amount);

        emit ERC20Withdrawn(token, recipient, amount);
    }

    /**
     * @dev Allows the treasury to receive native currency.
     */
    receive() external payable {}
}
