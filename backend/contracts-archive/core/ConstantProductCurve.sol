// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BondingCurveBase.sol";

contract ConstantProductCurve is BondingCurveBase {
    constructor(address _feeRecipient) BondingCurveBase(_feeRecipient) {}

    function calculateTokensOut(
        address token,
        uint256 ethIn
    ) public view override returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        uint256 k = info.virtualEthReserve * info.virtualTokenReserve;
        uint256 newEthReserve = info.virtualEthReserve + ethIn;
        uint256 newTokenReserve = k / newEthReserve;
        uint256 tokensOut = info.virtualTokenReserve - newTokenReserve;
        
        return tokensOut;
    }

    function calculateEthOut(
        address token,
        uint256 tokensIn
    ) public view override returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        uint256 k = info.virtualEthReserve * info.virtualTokenReserve;
        uint256 newTokenReserve = info.virtualTokenReserve + tokensIn;
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethOut = info.virtualEthReserve - newEthReserve;
        
        return ethOut;
    }

    function getTokenPrice(address token) public view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        if (info.virtualTokenReserve == 0) return 0;
        
        return (info.virtualEthReserve * 10**18) / info.virtualTokenReserve;
    }

    function getBuyPrice(
        address token,
        uint256 tokenAmount
    ) public view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        require(tokenAmount > 0, "Invalid token amount");
        
        uint256 k = info.virtualEthReserve * info.virtualTokenReserve;
        uint256 newTokenReserve = info.virtualTokenReserve - tokenAmount;
        require(newTokenReserve > 0, "Token amount too large");
        
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethRequired = newEthReserve - info.virtualEthReserve;
        
        uint256 platformFee = (ethRequired * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorFee = (ethRequired * CREATOR_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        
        return ethRequired + platformFee + creatorFee;
    }

    function getSellPrice(
        address token,
        uint256 tokenAmount
    ) public view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        require(tokenAmount > 0, "Invalid token amount");
        
        uint256 ethOut = calculateEthOut(token, tokenAmount);
        uint256 platformFee = (ethOut * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorFee = (ethOut * CREATOR_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        
        return ethOut - platformFee - creatorFee;
    }

    function getBuyPriceAfterFees(
        address token,
        uint256 ethAmount
    ) public view returns (uint256) {
        require(ethAmount > 0, "Invalid ETH amount");
        
        uint256 platformFee = (ethAmount * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorFee = (ethAmount * CREATOR_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 ethAmountAfterFees = ethAmount - platformFee - creatorFee;
        
        return calculateTokensOut(token, ethAmountAfterFees);
    }

    function getReserves(address token) public view override returns (
        uint256 virtualEthReserve,
        uint256 virtualTokenReserve,
        uint256 realEthReserve,
        uint256 realTokenReserve
    ) {
        TokenInfo memory info = tokenInfo[token];
        return (
            info.virtualEthReserve,
            info.virtualTokenReserve,
            info.realEthReserve,
            info.realTokenReserve
        );
    }

    function calculateK(address token) public view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        return info.virtualEthReserve * info.virtualTokenReserve;
    }

    function getMaxBuyAmount(address token) public view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        uint256 maxBuy = info.realTokenReserve / 10;
        return maxBuy;
    }

    function getMaxSellAmount(address token) public view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        uint256 maxSell = info.realTokenReserve / 10;
        return maxSell;
    }
}