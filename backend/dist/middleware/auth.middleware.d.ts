import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
export declare const generateToken: (address: string, role: UserRole) => string;
export declare const verifyToken: (token: string | undefined) => any;
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...allowedRoles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const verifySignature: (message: string, signature: string, expectedAddress: string) => Promise<boolean>;
export declare const authenticateWalletSignature: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map