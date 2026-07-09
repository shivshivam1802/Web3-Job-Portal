// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Treasury.sol";
import "./Payment.sol";

/**
 * @title Escrow
 * @dev Manages deposits, locks, fee deductions, and releases for freelance work.
 */
contract Escrow is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    enum EscrowState { Created, Funded, Disputed, Released, Refunded }

    struct EscrowInfo {
        address client;
        address freelancer;
        address token; // address(0) for native currency
        uint256 totalAmount;
        uint256 fundedAmount;
        uint256 releasedAmount;
        EscrowState state;
    }

    // Reference to Payment configuration contract
    Payment public paymentRegistry;

    // Reference to Treasury contract
    Treasury public treasury;

    // Mapping from Escrow ID (hash/uid) to Escrow Details
    mapping(bytes32 => EscrowInfo) public escrows;

    // Mapping to track authorized job contracts (can trigger lock, release, refund)
    mapping(address => bool) public authorizedCallers;

    // Events
    event EscrowCreated(bytes32 indexed escrowId, address indexed client, address indexed freelancer, address token, uint256 amount);
    event EscrowFunded(bytes32 indexed escrowId, uint256 amount);
    event EscrowReleased(bytes32 indexed escrowId, uint256 amount, uint256 feeAmount);
    event EscrowRefunded(bytes32 indexed escrowId, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId);
    event EscrowDisputeResolved(bytes32 indexed escrowId, EscrowState finalState);
    event CallerAuthorizationUpdated(address indexed caller, bool isAuthorized);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Escrow: Unauthorized caller");
        _;
    }

    constructor(
        address _initialOwner,
        address _paymentRegistry,
        address _treasury
    ) Ownable(_initialOwner) {
        require(_paymentRegistry != address(0), "Escrow: Invalid payment registry address");
        require(_treasury != address(0), "Escrow: Invalid treasury address");

        paymentRegistry = Payment(_paymentRegistry);
        treasury = Treasury(payable(_treasury));
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setAuthorizedCaller(address caller, bool isAuthorized) external onlyOwner {
        require(caller != address(0), "Escrow: Invalid caller address");
        authorizedCallers[caller] = isAuthorized;
        emit CallerAuthorizationUpdated(caller, isAuthorized);
    }

    /**
     * @dev Creates a new Escrow transaction slot.
     */
    function createEscrow(
        bytes32 escrowId,
        address client,
        address freelancer,
        address token,
        uint256 amount
    ) external onlyAuthorized whenNotPaused {
        require(escrows[escrowId].client == address(0), "Escrow: Escrow already exists");
        require(client != address(0), "Escrow: Invalid client");
        require(freelancer != address(0), "Escrow: Invalid freelancer");
        require(paymentRegistry.isTokenWhitelisted(token), "Escrow: Token not whitelisted");
        require(amount > 0, "Escrow: Amount must be greater than zero");

        escrows[escrowId] = EscrowInfo({
            client: client,
            freelancer: freelancer,
            token: token,
            totalAmount: amount,
            fundedAmount: 0,
            releasedAmount: 0,
            state: EscrowState.Created
        });

        emit EscrowCreated(escrowId, client, freelancer, token, amount);
    }

    /**
     * @dev Locks the funding into the escrow.
     * For native currency, msg.value must match the required amount.
     * For ERC20 tokens, the tokens are transferred from msg.sender to this contract.
     */
    function fundEscrow(bytes32 escrowId, uint256 amount) external payable nonReentrant whenNotPaused {
        EscrowInfo storage escrow = escrows[escrowId];
        require(escrow.client != address(0), "Escrow: Escrow does not exist");
        require(escrow.state == EscrowState.Created || escrow.state == EscrowState.Funded, "Escrow: Already funded or closed");
        require(escrow.fundedAmount + amount <= escrow.totalAmount, "Escrow: Funding exceeds total budget");

        escrow.state = EscrowState.Funded;
        escrow.fundedAmount += amount;

        if (escrow.token == address(0)) {
            require(msg.value == amount, "Escrow: Incorrect value sent");
        } else {
            require(msg.value == 0, "Escrow: Native value not expected");
            IERC20(escrow.token).safeTransferFrom(msg.sender, address(this), amount);
        }

        emit EscrowFunded(escrowId, amount);
    }

    /**
     * @dev Releases a portion or all of the escrowed funds to the freelancer, transferring fees to the treasury.
     * @param escrowId The escrow ID.
     * @param amount The amount to release.
     */
    function releaseFunds(
        bytes32 escrowId,
        uint256 amount
    ) external onlyAuthorized nonReentrant whenNotPaused {
        EscrowInfo storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Funded || escrow.state == EscrowState.Disputed, "Escrow: Invalid escrow state");
        require(escrow.releasedAmount + amount <= escrow.fundedAmount, "Escrow: Release amount exceeds funded amount");

        escrow.releasedAmount += amount;
        if (escrow.releasedAmount == escrow.totalAmount) {
            escrow.state = EscrowState.Released;
        }

        (uint256 fee, uint256 remaining) = treasury.calculateFee(amount);

        if (escrow.token == address(0)) {
            // Pay fee to treasury
            if (fee > 0) {
                (bool successFee, ) = address(treasury).call{value: fee}("");
                require(successFee, "Escrow: Fee transfer failed");
            }
            // Pay remainder to freelancer
            (bool successVal, ) = payable(escrow.freelancer).call{value: remaining}("");
            require(successVal, "Escrow: Payment transfer failed");
        } else {
            // Pay fee to treasury
            if (fee > 0) {
                IERC20(escrow.token).safeTransfer(address(treasury), fee);
            }
            // Pay remainder to freelancer
            IERC20(escrow.token).safeTransfer(escrow.freelancer, remaining);
        }

        emit EscrowReleased(escrowId, amount, fee);
    }

    /**
     * @dev Refunds the remaining locked funds to the client.
     */
    function refundFunds(bytes32 escrowId) external onlyAuthorized nonReentrant whenNotPaused {
        EscrowInfo storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Funded || escrow.state == EscrowState.Disputed, "Escrow: Invalid escrow state");
        
        uint256 remaining = escrow.fundedAmount - escrow.releasedAmount;
        require(remaining > 0, "Escrow: Nothing left to refund");

        escrow.releasedAmount = escrow.fundedAmount;
        escrow.state = EscrowState.Refunded;

        if (escrow.token == address(0)) {
            (bool success, ) = payable(escrow.client).call{value: remaining}("");
            require(success, "Escrow: Refund transfer failed");
        } else {
            IERC20(escrow.token).safeTransfer(escrow.client, remaining);
        }

        emit EscrowRefunded(escrowId, remaining);
    }

    /**
     * @dev Flags the escrow as disputed, halting normal interactions.
     */
    function disputeEscrow(bytes32 escrowId) external onlyAuthorized whenNotPaused {
        EscrowInfo storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Funded, "Escrow: Must be funded to dispute");
        escrow.state = EscrowState.Disputed;
        emit EscrowDisputed(escrowId);
    }

    /**
     * @dev Resolves a dispute with a custom distribution of remaining funds between freelancer and client.
     */
    function resolveDispute(
        bytes32 escrowId,
        uint256 freelancerAmount,
        uint256 clientAmount
    ) external onlyAuthorized nonReentrant whenNotPaused {
        EscrowInfo storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Disputed, "Escrow: Escrow not in dispute state");

        uint256 remaining = escrow.fundedAmount - escrow.releasedAmount;
        require(freelancerAmount + clientAmount == remaining, "Escrow: Invalid split sum");

        escrow.releasedAmount = escrow.fundedAmount;
        escrow.state = EscrowState.Released;

        if (freelancerAmount > 0) {
            (uint256 fee, uint256 freelancerRemaining) = treasury.calculateFee(freelancerAmount);
            if (escrow.token == address(0)) {
                if (fee > 0) {
                    (bool successFee, ) = address(treasury).call{value: fee}("");
                    require(successFee, "Escrow: Fee transfer failed");
                }
                (bool successVal, ) = payable(escrow.freelancer).call{value: freelancerRemaining}("");
                require(successVal, "Escrow: Freelancer payment failed");
            } else {
                if (fee > 0) {
                    IERC20(escrow.token).safeTransfer(address(treasury), fee);
                }
                IERC20(escrow.token).safeTransfer(escrow.freelancer, freelancerRemaining);
            }
        }

        if (clientAmount > 0) {
            if (escrow.token == address(0)) {
                (bool successVal, ) = payable(escrow.client).call{value: clientAmount}("");
                require(successVal, "Escrow: Client refund failed");
            } else {
                IERC20(escrow.token).safeTransfer(escrow.client, clientAmount);
            }
        }

        emit EscrowDisputeResolved(escrowId, EscrowState.Released);
    }
}
