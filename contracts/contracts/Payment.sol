// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title Payment
 * @dev Manages whitelisted payment tokens (stablecoins, native tokens) and their corresponding Chainlink price oracle aggregators.
 */
contract Payment is Ownable2Step, Pausable {
    
    struct TokenInfo {
        bool isWhitelisted;
        address oracleAddress; // Chainlink price feed address
    }

    // Mapping from token address to token status & oracle (address(0) for native or custom token if no oracle)
    mapping(address => TokenInfo) public whitelistedTokens;

    // Events
    event TokenWhitelisted(address indexed token, address indexed oracleAddress);
    event TokenRemoved(address indexed token);
    event OracleUpdated(address indexed token, address indexed oldOracle, address indexed newOracle);

    /**
     * @dev Constructor initializes owner and whitelists native token representation (address(0)).
     */
    constructor(address _initialOwner) Ownable(_initialOwner) {
        whitelistedTokens[address(0)] = TokenInfo({
            isWhitelisted: true,
            oracleAddress: address(0)
        });
        emit TokenWhitelisted(address(0), address(0));
    }

    /**
     * @dev Pauses the configuration controls.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the configuration controls.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Whitelists a token and registers its price feed oracle.
     * @param token Address of the token to whitelist.
     * @param oracleAddress Chainlink aggregator address (can be address(0) if no oracle is used).
     */
    function whitelistToken(address token, address oracleAddress) external onlyOwner whenNotPaused {
        whitelistedTokens[token] = TokenInfo({
            isWhitelisted: true,
            oracleAddress: oracleAddress
        });
        emit TokenWhitelisted(token, oracleAddress);
    }

    /**
     * @dev Removes a token from the whitelist.
     * @param token Address of the token to remove.
     */
    function removeToken(address token) external onlyOwner whenNotPaused {
        require(token != address(0), "Payment: Cannot remove native token");
        require(whitelistedTokens[token].isWhitelisted, "Payment: Token not whitelisted");
        
        delete whitelistedTokens[token];
        emit TokenRemoved(token);
    }

    /**
     * @dev Updates the price feed oracle address for a token.
     * @param token Address of the token.
     * @param newOracleAddress New Chainlink aggregator address.
     */
    function updateOracle(address token, address newOracleAddress) external onlyOwner whenNotPaused {
        require(whitelistedTokens[token].isWhitelisted, "Payment: Token not whitelisted");
        address oldOracle = whitelistedTokens[token].oracleAddress;
        whitelistedTokens[token].oracleAddress = newOracleAddress;
        emit OracleUpdated(token, oldOracle, newOracleAddress);
    }

    /**
     * @dev Returns whether a token is whitelisted.
     * @param token Address of the token.
     */
    function isTokenWhitelisted(address token) external view returns (bool) {
        return whitelistedTokens[token].isWhitelisted;
    }

    /**
     * @dev Returns the latest price from the registered Chainlink Oracle for a token.
     * Reverts if oracle address is not configured or if oracle returns stale data.
     * @param token Address of the token to check.
     * @return price Price scaled to 8 decimals.
     */
    function getTokenPriceUSD(address token) external view returns (uint256) {
        require(whitelistedTokens[token].isWhitelisted, "Payment: Token not whitelisted");
        address oracle = whitelistedTokens[token].oracleAddress;
        require(oracle != address(0), "Payment: Oracle not set for token");

        (, int256 price, , uint256 updatedAt, ) = IAggregatorV3(oracle).latestRoundData();
        require(price > 0, "Payment: Invalid price");
        require(block.timestamp - updatedAt < 24 hours, "Payment: Stale price feed");

        return uint256(price);
    }
}
