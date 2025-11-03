import { z } from 'zod';
import DOMPurify from 'dompurify';

// Sanitization helper
export const sanitizeInput = (input: string): string => {
  if (typeof window === 'undefined') return input; // Server-side fallback
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
};

// Ethereum address validation
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

// Common schemas
export const addressSchema = z
  .string()
  .trim()
  .regex(ethereumAddressRegex, 'Invalid Ethereum address')
  .transform(sanitizeInput);

export const tokenAmountSchema = z
  .string()
  .trim()
  .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  })
  .transform(sanitizeInput);

// Token creation schema
export const tokenCreationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Token name is required')
    .max(50, 'Token name must be less than 50 characters')
    .transform(sanitizeInput),
  
  symbol: z
    .string()
    .trim()
    .min(1, 'Token symbol is required')
    .max(10, 'Token symbol must be less than 10 characters')
    .toUpperCase()
    .transform(sanitizeInput),
  
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters')
    .transform(sanitizeInput),
  
  totalSupply: tokenAmountSchema,
  
  decimals: z
    .number()
    .int()
    .min(0, 'Decimals must be non-negative')
    .max(18, 'Decimals must be 18 or less'),
  
  buyTax: z
    .number()
    .min(0, 'Buy tax must be non-negative')
    .max(25, 'Buy tax cannot exceed 25%'),
  
  sellTax: z
    .number()
    .min(0, 'Sell tax must be non-negative')
    .max(25, 'Sell tax cannot exceed 25%'),
  
  maxWallet: z
    .number()
    .min(0.1, 'Max wallet must be at least 0.1%')
    .max(100, 'Max wallet cannot exceed 100%'),
  
  maxTransaction: z
    .number()
    .min(0.1, 'Max transaction must be at least 0.1%')
    .max(100, 'Max transaction cannot exceed 100%'),
  
  website: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? sanitizeInput(val) : undefined),
  
  twitter: z
    .string()
    .regex(/^@?[A-Za-z0-9_]{1,15}$/, 'Invalid Twitter handle')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? sanitizeInput(val) : undefined),
  
  telegram: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? sanitizeInput(val) : undefined),
});

// Escrow creation schema
export const escrowCreationSchema = z.object({
  kolAddress: addressSchema,
  
  kolName: z
    .string()
    .trim()
    .max(50, 'Name must be less than 50 characters')
    .optional()
    .transform((val) => val ? sanitizeInput(val) : undefined),
  
  tokenAddress: addressSchema,
  
  totalAmount: tokenAmountSchema,
  
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .transform(sanitizeInput),
  
  milestones: z.array(
    z.object({
      id: z.string(),
      title: z
        .string()
        .trim()
        .min(1, 'Milestone title is required')
        .max(100, 'Title must be less than 100 characters')
        .transform(sanitizeInput),
      
      description: z
        .string()
        .trim()
        .max(500, 'Description must be less than 500 characters')
        .optional()
        .transform((val) => val ? sanitizeInput(val) : undefined),
      
      amount: z
        .number()
        .positive('Amount must be positive'),
      
      deadline: z
        .string()
        .refine((date) => new Date(date) > new Date(), {
          message: 'Deadline must be in the future',
        }),
      
      deliverables: z
        .array(z.string().transform(sanitizeInput))
        .min(1, 'At least one deliverable is required'),
    })
  ).min(1, 'At least one milestone is required'),
  
  requiresVerification: z.boolean(),
  
  verificationThreshold: z
    .number()
    .int()
    .min(1, 'Threshold must be at least 1')
    .optional(),
  
  clawbackEnabled: z.boolean(),
  
  clawbackDeadline: z
    .string()
    .optional()
    .refine((date) => !date || new Date(date) > new Date(), {
      message: 'Clawback deadline must be in the future',
    }),
  
  disputeResolver: addressSchema.optional().or(z.literal('')),
  
  platformFee: z
    .number()
    .min(0, 'Platform fee must be non-negative')
    .max(10, 'Platform fee cannot exceed 10%'),
});

// Search/filter schemas
export const searchSchema = z
  .string()
  .trim()
  .max(100, 'Search query too long')
  .transform(sanitizeInput);

export const filterSchema = z.object({
  search: searchSchema.optional(),
  category: z.enum(['all', 'defi', 'gaming', 'meme', 'ai', 'nft']).optional(),
  minMarketCap: z.number().min(0).optional(),
  maxMarketCap: z.number().positive().optional(),
  showVerified: z.boolean().optional(),
  minHolders: z.number().min(0).optional(),
  maxAge: z.number().positive().optional(),
});

// Type exports
export type TokenCreationData = z.infer<typeof tokenCreationSchema>;
export type EscrowCreationData = z.infer<typeof escrowCreationSchema>;
export type FilterData = z.infer<typeof filterSchema>;