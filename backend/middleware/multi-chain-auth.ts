import { ethers } from 'ethers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Multi-chain signature verification
 */

// Verify EVM signature (existing logic)
export const verifyEVMSignature = async (
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('EVM signature verification error:', error);
    return false;
  }
};

// Verify Solana signature
export const verifySolanaSignature = async (
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> => {
  try {
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Convert signature from hex to bytes (if it's in hex format)
    let signatureBytes: Uint8Array;
    if (signature.startsWith('0x')) {
      signatureBytes = ethers.getBytes(signature);
    } else if (signature.length === 128) {
      // Hex string without 0x prefix
      signatureBytes = ethers.getBytes('0x' + signature);
    } else {
      // Assume base58 encoded
      signatureBytes = bs58.decode(signature);
    }
    
    // Convert public key from base58 to bytes
    const publicKeyBytes = bs58.decode(expectedAddress);
    
    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
    
    return isValid;
  } catch (error) {
    console.error('Solana signature verification error:', error);
    return false;
  }
};

// Unified signature verification
export const verifyMultiChainSignature = async (
  message: string,
  signature: string,
  expectedAddress: string,
  chainType: 'evm' | 'solana'
): Promise<boolean> => {
  // Development mode bypass for testing
  if (process.env['NODE_ENV'] === 'development' && signature === 'DEV_SIGNATURE_BYPASS') {
    console.log('⚠️  Development mode: Bypassing signature verification for', expectedAddress);
    return true;
  }

  if (chainType === 'evm') {
    return verifyEVMSignature(message, signature, expectedAddress);
  } else if (chainType === 'solana') {
    return verifySolanaSignature(message, signature, expectedAddress);
  } else {
    console.error('Unsupported chain type:', chainType);
    return false;
  }
};

// Validate address format
export const isValidAddress = (address: string, chainType: 'evm' | 'solana'): boolean => {
  if (chainType === 'evm') {
    return ethers.isAddress(address);
  } else if (chainType === 'solana') {
    try {
      // Check if it's a valid base58 string and has the right length (32-44 chars)
      const decoded = bs58.decode(address);
      return decoded.length === 32;
    } catch {
      return false;
    }
  }
  return false;
};

// Generate user ID from address (chain-agnostic)
export const generateUserId = (address: string, chainType: 'evm' | 'solana'): string => {
  if (chainType === 'evm') {
    return ethers.keccak256(ethers.toUtf8Bytes(address)).slice(0, 16);
  } else {
    // For Solana, use first 16 chars of address as ID
    return address.slice(0, 16);
  }
};