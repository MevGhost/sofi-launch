"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWalletSignature = exports.verifySignature = exports.authorize = exports.authenticate = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ethers_1 = require("ethers");
// Get JWT_SECRET dynamically to ensure env is loaded
const getJWTSecret = () => {
    const secret = process.env['JWT_SECRET'];
    // In production, fail hard if JWT_SECRET is not set
    if (!secret) {
        if (process.env['NODE_ENV'] === 'production') {
            throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Server cannot start in production without it.');
        }
        else {
            // Development warning
            console.error('WARNING: JWT_SECRET not set. Using unsafe development secret. NEVER deploy to production without setting JWT_SECRET!');
            return 'UNSAFE_DEVELOPMENT_SECRET_DO_NOT_USE_IN_PRODUCTION';
        }
    }
    // Validate JWT secret strength
    if (secret.length < 32) {
        console.warn('WARNING: JWT_SECRET should be at least 32 characters for security');
    }
    return secret;
};
const generateToken = (address, role) => {
    const hashedAddress = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(address));
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    return jsonwebtoken_1.default.sign({
        address: normalizedAddress,
        role,
        userId: hashedAddress.slice(0, 16),
    }, getJWTSecret(), { expiresIn: '7d' });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    if (!token) {
        throw new jsonwebtoken_1.default.JsonWebTokenError('No token provided');
    }
    return jsonwebtoken_1.default.verify(token, getJWTSecret());
};
exports.verifyToken = verifyToken;
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, exports.verifyToken)(token);
        req.user = {
            address: decoded.address,
            role: decoded.role,
            userId: decoded.userId,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
        }
        else {
            res.status(500).json({ error: 'Authentication error' });
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
const verifySignature = async (message, signature, expectedAddress) => {
    // Development mode bypass for testing
    if (process.env['NODE_ENV'] === 'development' && signature === 'DEV_SIGNATURE_BYPASS') {
        console.log('⚠️  Development mode: Bypassing signature verification for', expectedAddress);
        return true;
    }
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        // Only lowercase EVM addresses for comparison
        if (recoveredAddress.startsWith('0x') && expectedAddress.startsWith('0x')) {
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        }
        return recoveredAddress === expectedAddress;
    }
    catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};
exports.verifySignature = verifySignature;
const authenticateWalletSignature = async (req, res, next) => {
    try {
        const { message, signature, address } = req.body;
        if (!message || !signature || !address) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const isValid = await (0, exports.verifySignature)(message, signature, address);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        // Check message timestamp to prevent replay attacks
        try {
            const parsedMessage = JSON.parse(message);
            const messageTime = new Date(parsedMessage.timestamp).getTime();
            const currentTime = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            if (currentTime - messageTime > fiveMinutes) {
                res.status(401).json({ error: 'Signature expired' });
                return;
            }
        }
        catch {
            res.status(400).json({ error: 'Invalid message format' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Wallet authentication error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
};
exports.authenticateWalletSignature = authenticateWalletSignature;
//# sourceMappingURL=auth.middleware.js.map