"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'tokens');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `token-${uniqueSuffix}${ext}`);
    }
});
// File filter to only accept images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'));
    }
};
// Create multer upload instance
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});
/**
 * POST /api/upload/token-image
 * Upload a token image
 */
router.post('/token-image', auth_middleware_1.authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
            return;
        }
        // Build the public URL for the uploaded file
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
        const imageUrl = `${baseUrl}/uploads/tokens/${req.file.filename}`;
        res.json({
            success: true,
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: imageUrl
            }
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload file'
        });
    }
});
/**
 * DELETE /api/upload/token-image/:filename
 * Delete a token image (admin only)
 */
router.delete('/token-image/:filename', auth_middleware_1.authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Unauthorized'
            });
            return;
        }
        const { filename } = req.params;
        const filepath = path_1.default.join(uploadsDir, filename);
        // Check if file exists
        if (!fs_1.default.existsSync(filepath)) {
            res.status(404).json({
                success: false,
                error: 'File not found'
            });
            return;
        }
        // Delete the file
        fs_1.default.unlinkSync(filepath);
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file'
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map