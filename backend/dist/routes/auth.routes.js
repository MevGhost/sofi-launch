"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_service_1 = require("../services/user.service");
const database_service_1 = require("../services/database.service");
const multi_chain_auth_1 = require("../middleware/multi-chain-auth");
const router = (0, express_1.Router)();
// Check if we're in development mode
const isDevelopment = process.env['NODE_ENV'] === 'development';
router.post('/login', async (req, res) => {
    try {
        const { message, signature, address, chainType = 'evm' } = req.body;
        // Validate input
        if (!message || !signature || !address) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        if (!(0, multi_chain_auth_1.isValidAddress)(address, chainType)) {
            res.status(400).json({ error: `Invalid ${chainType} address` });
            return;
        }
        // Verify signature using multi-chain verification
        const isValid = await (0, multi_chain_auth_1.verifyMultiChainSignature)(message, signature, address, chainType);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        // Parse and validate message
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        }
        catch {
            res.status(400).json({ error: 'Invalid message format' });
            return;
        }
        // Check timestamp (5 minute window)
        const messageTime = new Date(parsedMessage.timestamp).getTime();
        const currentTime = Date.now();
        if (currentTime - messageTime > 5 * 60 * 1000) {
            res.status(401).json({ error: 'Login request expired' });
            return;
        }
        // Verify nonce from database (skip for dev bypass)
        if (!isDevelopment) {
            const storedNonce = await (0, user_service_1.getUserNonce)(address);
            if (!storedNonce || storedNonce !== parsedMessage.nonce) {
                res.status(401).json({ error: 'Invalid or expired nonce' });
                return;
            }
        }
        // Create or update user in database
        const user = await (0, user_service_1.createOrUpdateUser)(address);
        // Clear the nonce after successful login
        await (0, user_service_1.updateUserNonce)(address, '');
        // Log activity - ensure we have a valid user before logging
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        console.log('Login - About to log activity:', {
            userAddress: user.address,
            chainType,
            originalAddress: address,
            userId: user.id
        });
        try {
            await database_service_1.db.logActivity({
                userAddress: user.address, // Use the user's actual address
                action: 'USER_LOGIN',
                details: {
                    method: chainType === 'solana' ? 'phantom' : 'metamask',
                    chainType,
                    originalAddress: address
                },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                chain: parsedMessage.chain || parsedMessage.chainType || (chainType === 'solana' ? 'solana-devnet' : 'base-sepolia'),
            });
        }
        catch (activityError) {
            console.error('Failed to log activity:', activityError);
            // Don't fail the login just because activity logging failed
        }
        // Get user role (from database or smart contract)
        const role = user?.role || 'team';
        console.log('[Auth] Final user role before JWT:', {
            userRole: user?.role,
            finalRole: role,
            userAddress: user?.address
        });
        // Generate JWT
        const token = (0, auth_middleware_1.generateToken)(user.address, role);
        console.log('[Auth] Generated token for user:', {
            address: user.address,
            role: role
        });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    address: user.address,
                    role: role.toUpperCase(),
                    createdAt: user.createdAt.toISOString(),
                }
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET verify endpoint for token validation (frontend expects GET)
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided'
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        // This will throw if invalid
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'your-secret-key');
        // Get full user data from database
        const user = await database_service_1.db.getUserByAddress(decoded.address);
        res.json({
            success: true,
            data: {
                valid: true,
                user: {
                    id: user?.id || decoded.userId,
                    address: decoded.address,
                    role: (user?.role || decoded.role).toUpperCase(),
                    createdAt: user?.createdAt?.toISOString() || new Date().toISOString(),
                }
            }
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            data: { valid: false }
        });
    }
});
// POST nonce endpoint for initial auth flow (frontend expects POST)
router.post('/nonce', async (req, res) => {
    try {
        const { address } = req.body;
        const chainType = 'evm'; // Default to EVM for Base L2
        if (!address || !(0, multi_chain_auth_1.isValidAddress)(address, chainType)) {
            res.status(400).json({ error: 'Invalid address' });
            return;
        }
        // Get or create nonce for the user
        const nonce = await (0, user_service_1.getUserNonce)(address);
        res.json({
            success: true,
            data: { nonce }
        });
    }
    catch (error) {
        console.error('Error generating nonce:', error);
        res.status(500).json({ error: 'Failed to generate nonce' });
    }
});
// GET nonce endpoint for initial auth flow (keeping for backward compatibility)
router.get('/nonce', async (req, res) => {
    try {
        const address = req.query.address;
        const chain = req.query.chain || 'base-sepolia';
        const chainType = req.query.chainType || (chain.includes('solana') ? 'solana' : 'evm');
        if (!address || !(0, multi_chain_auth_1.isValidAddress)(address, chainType)) {
            res.status(400).json({ error: 'Invalid address' });
            return;
        }
        // Generate nonce for signing
        const nonce = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
        const timestamp = new Date().toISOString();
        // Store nonce in database
        if (chainType === 'solana') {
            // For Solana, store the actual Solana address
            const user = await database_service_1.db.client.user.findFirst({
                where: { address: address }
            });
            if (!user) {
                // Create a new user with the actual Solana address
                await database_service_1.db.client.user.create({
                    data: {
                        address: address,
                        nonce,
                        role: 'team',
                        chainType: 'solana',
                    }
                });
            }
            else {
                // Update existing user's nonce
                await database_service_1.db.client.user.update({
                    where: { id: user.id },
                    data: { nonce }
                });
            }
        }
        else {
            // For EVM addresses, use the existing flow
            await (0, user_service_1.createOrUpdateUser)(address);
            await (0, user_service_1.updateUserNonce)(address, nonce);
        }
        const message = JSON.stringify({
            type: 'LOGIN',
            address: chainType === 'solana' ? address : address.toLowerCase(),
            nonce,
            timestamp,
            domain: process.env['APP_DOMAIN'] || 'localhost',
            chainType,
        });
        res.json({
            message,
            nonce,
            timestamp,
        });
    }
    catch (error) {
        console.error('Nonce generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST logout endpoint
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const jwt = require('jsonwebtoken');
            try {
                const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'your-secret-key');
                // Log the logout activity
                await database_service_1.db.logActivity({
                    userAddress: decoded.address,
                    action: 'USER_LOGOUT',
                    details: {},
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
            }
            catch {
                // Token might be invalid, but we still want to logout
            }
        }
        // Always return success for logout
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        // Even on error, return success to clear client state
        res.json({
            success: true,
            message: 'Logged out'
        });
    }
});
// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'your-secret-key');
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = decoded.address.startsWith('0x') ? decoded.address.toLowerCase() : decoded.address;
        const user = await database_service_1.db.client.user.findUnique({
            where: { address: normalizedAddress },
            select: {
                address: true,
                name: true,
                email: true,
                avatar: true,
                bio: true,
                role: true,
                createdAt: true,
                lastLogin: true,
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});
// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'your-secret-key');
        const { name, email, bio, avatar } = req.body;
        // Validate email if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: 'Invalid email format' });
            return;
        }
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = decoded.address.startsWith('0x') ? decoded.address.toLowerCase() : decoded.address;
        const updatedUser = await database_service_1.db.client.user.update({
            where: { address: normalizedAddress },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email: email || null }),
                ...(bio !== undefined && { bio }),
                ...(avatar !== undefined && { avatar }),
                updatedAt: new Date(),
            },
            select: {
                address: true,
                name: true,
                email: true,
                avatar: true,
                bio: true,
                role: true,
            }
        });
        res.json({ success: true, data: updatedUser });
    }
    catch (error) {
        console.error('Update profile error:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            res.status(400).json({ error: 'Email already in use' });
            return;
        }
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map