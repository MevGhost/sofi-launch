import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import { ValidationError } from '../middleware/errorHandler';

const ethereumAddressSchema = z.string().refine(
  (value) => ethers.isAddress(value),
  { message: 'Invalid Ethereum address' }
);

const createEscrowSchema = z.object({
  dealBasics: z.object({
    projectName: z.string().min(1, 'Project name is required'),
    dealType: z.string().min(1, 'Deal type is required'),
    customDealType: z.string().optional(),
    kolName: z.string().min(1, 'KOL name is required'),
    kolAddress: ethereumAddressSchema,
    tokenAddress: ethereumAddressSchema,
    tokenSymbol: z.string().min(1, 'Token symbol is required'),
    tokenDecimals: z.number().int().min(0).max(18),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    dealDescription: z.string().min(1, 'Deal description is required'),
  }),
  milestones: z.array(
    z.object({
      title: z.string().min(1, 'Milestone title is required'),
      description: z.string().min(1, 'Milestone description is required'),
      amount: z.number().positive('Amount must be positive'),
      percentage: z.number().min(0).max(100),
      releaseDate: z.string().datetime(),
      conditions: z.array(z.string()),
    })
  ).min(1, 'At least one milestone is required'),
  verificationSettings: z.object({
    requireVerification: z.boolean(),
    verificationMethod: z.enum(['single', 'majority', 'unanimous']),
    verifierAddresses: z.array(ethereumAddressSchema),
    disputeResolutionMethod: z.enum(['admin', 'dao', 'arbitrator']),
    arbitratorAddress: ethereumAddressSchema.optional(),
  }),
  signature: z.string().min(1, 'Signature is required'),
  deployerAddress: ethereumAddressSchema,
}).refine(
  (data) => {
    const total = data.milestones.reduce((sum, m) => sum + m.percentage, 0);
    return Math.abs(total - 100) < 0.01;
  },
  { message: 'Milestone percentages must sum to 100%' }
).refine(
  (data) => {
    return new Date(data.dealBasics.startDate) < new Date(data.dealBasics.endDate);
  },
  { message: 'End date must be after start date' }
).refine(
  (data) => {
    if (data.verificationSettings.requireVerification) {
      return data.verificationSettings.verifierAddresses.length > 0;
    }
    return true;
  },
  { message: 'Verifier addresses required when verification is enabled' }
);

const releasePaymentSchema = z.object({
  milestoneId: z.number().int().min(0),
  verifierSignatures: z.array(
    z.object({
      address: ethereumAddressSchema,
      signature: z.string().min(1),
    })
  ).optional(),
});

export const validateCreateEscrow = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const result = createEscrowSchema.safeParse(req.body);
    
    if (!result.success) {
      throw new ValidationError(
        'Invalid request data',
        result.error.format()
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

export const validateReleasePayment = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const result = releasePaymentSchema.safeParse(req.body);
    
    if (!result.success) {
      throw new ValidationError(
        'Invalid request data',
        result.error.format()
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
};