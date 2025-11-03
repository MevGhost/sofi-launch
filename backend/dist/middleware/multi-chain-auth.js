"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserId = exports.isValidAddress = exports.verifyMultiChainSignature = exports.verifySolanaSignature = exports.verifyEVMSignature = void 0;
const ethers_1 = require("ethers");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
/**
 * Multi-chain signature verification
 */
// Verify EVM signature (existing logic)
const verifyEVMSignature = async (message, signature, expectedAddress) => {
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    }
    catch (error) {
        console.error('EVM signature verification error:', error);
        return false;
    }
};
exports.verifyEVMSignature = verifyEVMSignature;
// Verify Solana signature
const verifySolanaSignature = async (message, signature, expectedAddress) => {
    try {
        // Convert message to bytes
        const messageBytes = new TextEncoder().encode(message);
        // Convert signature from hex to bytes (if it's in hex format)
        let signatureBytes;
        if (signature.startsWith('0x')) {
            signatureBytes = ethers_1.ethers.getBytes(signature);
        }
        else if (signature.length === 128) {
            // Hex string without 0x prefix
            signatureBytes = ethers_1.ethers.getBytes('0x' + signature);
        }
        else {
            // Assume base58 encoded
            signatureBytes = bs58_1.default.decode(signature);
        }
        // Convert public key from base58 to bytes
        const publicKeyBytes = bs58_1.default.decode(expectedAddress);
        // Verify signature
        const isValid = tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        return isValid;
    }
    catch (error) {
        console.error('Solana signature verification error:', error);
        return false;
    }
};
exports.verifySolanaSignature = verifySolanaSignature;
// Unified signature verification
const verifyMultiChainSignature = async (message, signature, expectedAddress, chainType) => {
    // Development mode bypass for testing
    if (process.env['NODE_ENV'] === 'development' && signature === 'DEV_SIGNATURE_BYPASS') {
        console.log('⚠️  Development mode: Bypassing signature verification for', expectedAddress);
        return true;
    }
    if (chainType === 'evm') {
        return (0, exports.verifyEVMSignature)(message, signature, expectedAddress);
    }
    else if (chainType === 'solana') {
        return (0, exports.verifySolanaSignature)(message, signature, expectedAddress);
    }
    else {
        console.error('Unsupported chain type:', chainType);
        return false;
    }
};
exports.verifyMultiChainSignature = verifyMultiChainSignature;
// Validate address format
const isValidAddress = (address, chainType) => {
    if (chainType === 'evm') {
        return ethers_1.ethers.isAddress(address);
    }
    else if (chainType === 'solana') {
        try {
            // Check if it's a valid base58 string and has the right length (32-44 chars)
            const decoded = bs58_1.default.decode(address);
            return decoded.length === 32;
        }
        catch {
            return false;
        }
    }
    return false;
};
exports.isValidAddress = isValidAddress;
// Generate user ID from address (chain-agnostic)
const generateUserId = (address, chainType) => {
    if (chainType === 'evm') {
        return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(address)).slice(0, 16);
    }
    else {
        // For Solana, use first 16 chars of address as ID
        return address.slice(0, 16);
    }
};
exports.generateUserId = generateUserId;
//# sourceMappingURL=multi-chain-auth.js.map