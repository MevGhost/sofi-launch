// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @notice Secure price oracle with circuit breakers and validation
 * @dev Prevents price manipulation and stale data attacks
 */
contract PriceOracle is Ownable {
    // Circuit breaker parameters
    uint256 public constant MIN_ETH_PRICE = 500 * 10**8;   // $500 minimum
    uint256 public constant MAX_ETH_PRICE = 10000 * 10**8; // $10,000 maximum
    uint256 public constant MAX_PRICE_AGE = 3600;          // 1 hour max age
    uint256 public constant MAX_PRICE_DEVIATION = 1000;    // 10% max deviation in one update
    
    // State variables
    AggregatorV3Interface public immutable priceFeed;
    uint256 public lastGoodPrice;
    uint256 public lastUpdateTime;
    bool public circuitBreakerActive;
    
    // Emergency fallback price
    uint256 public fallbackPrice = 3000 * 10**8; // $3000 default
    
    // Events
    event PriceUpdated(uint256 price, uint256 timestamp);
    event CircuitBreakerActivated(string reason);
    event CircuitBreakerDeactivated();
    event FallbackPriceUsed(uint256 price);
    event PriceFeedChanged(address newFeed);
    
    // Errors
    error PriceOutOfBounds(uint256 price);
    error PriceTooOld(uint256 age);
    error PriceDeviationTooHigh(uint256 deviation);
    error InvalidPriceFeed();
    error CircuitBreakerIsActive();
    
    constructor(address _priceFeed) {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = AggregatorV3Interface(_priceFeed);
        
        // Initialize with current price
        (uint256 price, bool isValid) = _fetchPrice();
        if (isValid) {
            lastGoodPrice = price;
            lastUpdateTime = block.timestamp;
        } else {
            lastGoodPrice = fallbackPrice;
            lastUpdateTime = block.timestamp;
            circuitBreakerActive = true;
        }
    }
    
    /**
     * @notice Get current ETH price with all safety checks
     * @return price Current ETH price in USD (8 decimals)
     * @return isStale Whether the price might be stale
     */
    function getPrice() external view returns (uint256 price, bool isStale) {
        // Check if circuit breaker is active
        if (circuitBreakerActive) {
            return (fallbackPrice, true);
        }
        
        // Try to get fresh price
        (uint256 currentPrice, bool isValid) = _fetchPrice();
        
        if (!isValid) {
            // Return last good price if current is invalid
            return (lastGoodPrice, block.timestamp - lastUpdateTime > MAX_PRICE_AGE);
        }
        
        // Validate price bounds
        if (!_isPriceInBounds(currentPrice)) {
            return (lastGoodPrice, true);
        }
        
        // Check for excessive deviation
        if (!_isPriceDeviationAcceptable(currentPrice)) {
            return (lastGoodPrice, true);
        }
        
        return (currentPrice, false);
    }
    
    /**
     * @notice Get price for contract interactions (reverts if unsafe)
     * @return price Current ETH price in USD (8 decimals)
     */
    function getSafePrice() external view returns (uint256 price) {
        if (circuitBreakerActive) {
            revert CircuitBreakerIsActive();
        }
        
        (uint256 currentPrice, bool isValid) = _fetchPrice();
        
        if (!isValid) {
            revert InvalidPriceFeed();
        }
        
        if (!_isPriceInBounds(currentPrice)) {
            revert PriceOutOfBounds(currentPrice);
        }
        
        if (!_isPriceDeviationAcceptable(currentPrice)) {
            revert PriceDeviationTooHigh(_calculateDeviation(currentPrice));
        }
        
        return currentPrice;
    }
    
    /**
     * @notice Update the cached price (called periodically)
     */
    function updatePrice() external returns (uint256) {
        (uint256 currentPrice, bool isValid) = _fetchPrice();
        
        if (!isValid) {
            _activateCircuitBreaker("Invalid price feed");
            return lastGoodPrice;
        }
        
        if (!_isPriceInBounds(currentPrice)) {
            _activateCircuitBreaker("Price out of bounds");
            return lastGoodPrice;
        }
        
        if (!_isPriceDeviationAcceptable(currentPrice)) {
            _activateCircuitBreaker("Price deviation too high");
            return lastGoodPrice;
        }
        
        // Update cached values
        lastGoodPrice = currentPrice;
        lastUpdateTime = block.timestamp;
        
        // Deactivate circuit breaker if it was active
        if (circuitBreakerActive) {
            circuitBreakerActive = false;
            emit CircuitBreakerDeactivated();
        }
        
        emit PriceUpdated(currentPrice, block.timestamp);
        return currentPrice;
    }
    
    /**
     * @notice Calculate price impact for large trades
     * @param ethAmount Amount of ETH being traded
     * @return impactBps Price impact in basis points
     */
    function calculatePriceImpact(uint256 ethAmount) external view returns (uint256 impactBps) {
        // Simple model: 1 ETH = 0.01% impact
        // Can be made more sophisticated based on liquidity
        impactBps = (ethAmount * 1) / 1 ether;
        if (impactBps > 1000) impactBps = 1000; // Cap at 10%
    }
    
    /**
     * @notice Check if trading should be allowed
     * @return allowed Whether trading is safe
     * @return reason Reason if not allowed
     */
    function isTradingAllowed() external view returns (bool allowed, string memory reason) {
        if (circuitBreakerActive) {
            return (false, "Circuit breaker active");
        }
        
        if (block.timestamp - lastUpdateTime > MAX_PRICE_AGE) {
            return (false, "Price data too old");
        }
        
        (uint256 currentPrice, bool isValid) = _fetchPrice();
        
        if (!isValid) {
            return (false, "Invalid price feed");
        }
        
        if (!_isPriceInBounds(currentPrice)) {
            return (false, "Price out of acceptable range");
        }
        
        return (true, "");
    }
    
    // Internal functions
    
    function _fetchPrice() private view returns (uint256 price, bool isValid) {
        try priceFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // Validate the response
            if (answer <= 0) return (0, false);
            if (updatedAt == 0) return (0, false);
            if (answeredInRound < roundId) return (0, false);
            
            // Check if price is stale
            if (block.timestamp - updatedAt > MAX_PRICE_AGE) {
                return (uint256(answer), false);
            }
            
            return (uint256(answer), true);
        } catch {
            return (0, false);
        }
    }
    
    function _isPriceInBounds(uint256 price) private pure returns (bool) {
        return price >= MIN_ETH_PRICE && price <= MAX_ETH_PRICE;
    }
    
    function _isPriceDeviationAcceptable(uint256 newPrice) private view returns (bool) {
        if (lastGoodPrice == 0) return true;
        
        uint256 deviation = _calculateDeviation(newPrice);
        return deviation <= MAX_PRICE_DEVIATION;
    }
    
    function _calculateDeviation(uint256 newPrice) private view returns (uint256) {
        if (lastGoodPrice == 0) return 0;
        
        uint256 diff;
        if (newPrice > lastGoodPrice) {
            diff = newPrice - lastGoodPrice;
        } else {
            diff = lastGoodPrice - newPrice;
        }
        
        return (diff * 10000) / lastGoodPrice; // Basis points
    }
    
    function _activateCircuitBreaker(string memory reason) private {
        if (!circuitBreakerActive) {
            circuitBreakerActive = true;
            emit CircuitBreakerActivated(reason);
        }
    }
    
    // Admin functions
    
    /**
     * @notice Manually deactivate circuit breaker
     */
    function deactivateCircuitBreaker() external onlyOwner {
        require(circuitBreakerActive, "Not active");
        
        // Verify price is now valid
        (uint256 currentPrice, bool isValid) = _fetchPrice();
        require(isValid && _isPriceInBounds(currentPrice), "Price still invalid");
        
        circuitBreakerActive = false;
        lastGoodPrice = currentPrice;
        lastUpdateTime = block.timestamp;
        
        emit CircuitBreakerDeactivated();
    }
    
    /**
     * @notice Update fallback price for emergencies
     */
    function setFallbackPrice(uint256 _price) external onlyOwner {
        require(_price >= MIN_ETH_PRICE && _price <= MAX_ETH_PRICE, "Invalid price");
        fallbackPrice = _price;
    }
    
    /**
     * @notice Emergency function to force a specific price
     */
    function emergencySetPrice(uint256 _price) external onlyOwner {
        require(_price >= MIN_ETH_PRICE && _price <= MAX_ETH_PRICE, "Invalid price");
        lastGoodPrice = _price;
        lastUpdateTime = block.timestamp;
        emit PriceUpdated(_price, block.timestamp);
    }
}