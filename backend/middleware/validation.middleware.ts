import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

// Custom error for validation failures
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: any,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Sanitization helpers
export const sanitize = {
  // Remove HTML tags and scripts
  html: (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  },

  // Escape special SQL characters
  sql: (input: string): string => {
    return input
      .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
          case '\0': return '\\0';
          case '\x08': return '\\b';
          case '\x09': return '\\t';
          case '\x1a': return '\\z';
          case '\n': return '\\n';
          case '\r': return '\\r';
          case '"':
          case "'":
          case '\\':
          case '%':
            return '\\' + char;
          default:
            return char;
        }
      });
  },

  // Sanitize file names
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .substring(0, 255);
  },

  // Sanitize URLs
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      throw new ValidationError('Invalid URL format');
    }
  },

  // Sanitize Ethereum addresses
  ethAddress: (input: string): string => {
    if (!validator.isEthereumAddress(input)) {
      throw new ValidationError('Invalid Ethereum address');
    }
    return input.toLowerCase();
  },

  // Sanitize Solana addresses
  solanaAddress: (input: string): string => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
    if (!solanaAddressRegex.test(input)) {
      throw new ValidationError('Invalid Solana address');
    }
    return input;
  },

  // Sanitize numeric input
  number: (input: any, min?: number, max?: number): number => {
    const num = Number(input);
    if (isNaN(num)) {
      throw new ValidationError('Invalid number');
    }
    if (min !== undefined && num < min) {
      throw new ValidationError(`Number must be at least ${min}`);
    }
    if (max !== undefined && num > max) {
      throw new ValidationError(`Number must be at most ${max}`);
    }
    return num;
  },

  // Sanitize boolean input
  boolean: (input: any): boolean => {
    if (typeof input === 'boolean') return input;
    if (input === 'true' || input === '1') return true;
    if (input === 'false' || input === '0') return false;
    throw new ValidationError('Invalid boolean value');
  },
};

// Common validation schemas
export const commonSchemas = {
  // Ethereum address
  ethAddress: z.string()
    .min(42)
    .max(42)
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .transform(val => val.toLowerCase()),

  // Solana address
  solanaAddress: z.string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/, 'Invalid Solana address'),

  // Generic blockchain address (ETH or Solana)
  blockchainAddress: z.union([
    commonSchemas.ethAddress,
    commonSchemas.solanaAddress,
  ]),

  // Transaction hash
  transactionHash: z.string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),

  // Token amount (as string for big numbers)
  tokenAmount: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Invalid token amount')
    .refine(val => parseFloat(val) > 0, 'Amount must be positive'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
  }),

  // File upload
  fileUpload: z.object({
    filename: z.string().max(255),
    mimetype: z.enum([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ]),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
  }),
};

// Request validation middleware factory
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize body
      if (schema.body) {
        const validated = await schema.body.parseAsync(req.body);
        req.body = validated;
      }

      // Validate and sanitize query
      if (schema.query) {
        const validated = await schema.query.parseAsync(req.query);
        req.query = validated as any;
      }

      // Validate and sanitize params
      if (schema.params) {
        const validated = await schema.params.parseAsync(req.params);
        req.params = validated as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details,
          },
        });
        return;
      }

      next(error);
    }
  };
};

// Content Security Policy validation
export const validateCSP = (req: Request, res: Response, next: NextFunction) => {
  // Check for CSP bypass attempts
  const suspiciousHeaders = [
    'x-xss-protection',
    'x-content-type-options',
    'x-frame-options',
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers[header] && req.headers[header] === '0') {
      res.status(400).json({
        success: false,
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Suspicious headers detected',
        },
      });
      return;
    }
  }

  next();
};

// SQL injection prevention middleware
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_|0x)/gi,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (checkValue(value[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    console.warn('Potential SQL injection attempt detected:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid characters detected in request',
      },
    });
    return;
  }

  next();
};

// NoSQL injection prevention
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkValue = (value: any): boolean => {
    if (typeof value === 'object' && value !== null) {
      // Check for MongoDB operators
      for (const key in value) {
        if (key.startsWith('$')) {
          return true;
        }
        if (typeof value[key] === 'object' && checkValue(value[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query)) {
    console.warn('Potential NoSQL injection attempt detected:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid operators detected in request',
      },
    });
    return;
  }

  next();
};

// Path traversal prevention
export const preventPathTraversal = (req: Request, res: Response, next: NextFunction) => {
  const pathPatterns = [
    /\.\./,
    /\.\.%2F/i,
    /\.\.%5C/i,
    /%2E%2E/i,
    /\x00/,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      for (const pattern of pathPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };

  const allValues = [
    ...Object.values(req.params),
    ...Object.values(req.query),
    req.path,
  ];

  for (const value of allValues) {
    if (checkValue(value)) {
      console.warn('Path traversal attempt detected:', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid path characters detected',
        },
      });
      return;
    }
  }

  next();
};

// Combined security validation middleware
export const securityValidation = [
  validateCSP,
  preventSQLInjection,
  preventNoSQLInjection,
  preventPathTraversal,
];

// Specific route validation schemas
export const validationSchemas = {
  // Auth routes
  auth: {
    login: validateRequest({
      body: z.object({
        address: commonSchemas.blockchainAddress,
        signature: z.string().min(1),
        message: z.string().min(1),
        chain: z.enum(['evm', 'solana']).optional(),
      }),
    }),
    
    nonce: validateRequest({
      body: z.object({
        address: commonSchemas.blockchainAddress,
      }),
    }),
  },

  // Token routes
  token: {
    create: validateRequest({
      body: z.object({
        name: z.string().min(1).max(100).transform(sanitize.html),
        symbol: z.string().min(1).max(10).transform(sanitize.html),
        description: z.string().max(1000).transform(sanitize.html),
        imageUrl: z.string().url().optional(),
        twitter: z.string().url().optional(),
        telegram: z.string().url().optional(),
        website: z.string().url().optional(),
        bondingCurveType: z.enum(['linear', 'exponential', 'logarithmic']),
        initialPrice: commonSchemas.tokenAmount,
        totalSupply: commonSchemas.tokenAmount,
      }),
    }),

    trade: validateRequest({
      body: z.object({
        tokenAddress: commonSchemas.ethAddress,
        amount: commonSchemas.tokenAmount,
        tradeType: z.enum(['buy', 'sell']),
        slippage: z.number().min(0).max(50).optional(),
      }),
    }),

    list: validateRequest({
      query: z.object({
        ...commonSchemas.pagination.shape,
        search: z.string().max(100).optional(),
        category: z.string().optional(),
        minMarketCap: z.coerce.number().optional(),
        maxMarketCap: z.coerce.number().optional(),
        graduated: z.coerce.boolean().optional(),
      }),
    }),
  },

  // Escrow routes
  escrow: {
    create: validateRequest({
      body: z.object({
        projectName: z.string().min(1).max(200).transform(sanitize.html),
        dealType: z.string().min(1).max(50),
        dealDescription: z.string().max(5000).transform(sanitize.html),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        projectAddress: commonSchemas.blockchainAddress,
        kolAddress: commonSchemas.blockchainAddress,
        tokenAddress: commonSchemas.blockchainAddress,
        tokenSymbol: z.string().max(10),
        tokenDecimals: z.number().int().min(0).max(18),
        totalAmount: commonSchemas.tokenAmount,
        requireVerification: z.boolean(),
        verificationMethod: z.enum(['SINGLE', 'MAJORITY', 'UNANIMOUS']).optional(),
        milestones: z.array(z.object({
          title: z.string().max(200).transform(sanitize.html),
          description: z.string().max(2000).transform(sanitize.html),
          amount: commonSchemas.tokenAmount,
          percentage: z.number().min(0).max(100),
          releaseDate: z.coerce.date(),
          conditions: z.array(z.string().max(500)).max(10),
        })).min(1).max(20),
        verifierAddresses: z.array(commonSchemas.blockchainAddress).max(10).optional(),
      }),
    }),

    update: validateRequest({
      params: z.object({
        id: z.string().uuid(),
      }),
      body: z.object({
        status: z.enum(['ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED']).optional(),
        milestoneStatus: z.object({
          milestoneIndex: z.number().int().min(0),
          released: z.boolean().optional(),
          verified: z.boolean().optional(),
        }).optional(),
      }),
    }),
  },

  // Admin routes
  admin: {
    updateSettings: validateRequest({
      body: z.object({
        platformFeePercentage: z.number().min(0).max(10).optional(),
        minEscrowAmount: commonSchemas.tokenAmount.optional(),
        maxEscrowDuration: z.number().int().min(1).max(365).optional(),
        emergencyPaused: z.boolean().optional(),
      }),
    }),

    banUser: validateRequest({
      body: z.object({
        address: commonSchemas.blockchainAddress,
        reason: z.string().max(500).transform(sanitize.html),
        duration: z.number().int().min(1).optional(),
      }),
    }),
  },

  // Upload routes
  upload: {
    tokenImage: validateRequest({
      body: z.object({
        filename: z.string().transform(sanitize.filename),
        mimetype: commonSchemas.fileUpload.shape.mimetype,
        size: commonSchemas.fileUpload.shape.size,
      }),
    }),
  },
};

// Export all validation utilities
export default {
  sanitize,
  commonSchemas,
  validateRequest,
  securityValidation,
  validationSchemas,
};