import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user as JWTPayload;
    next();
  });
};


export const authorizeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'User not authenticated or role missing' });
    }

    // Convert everything to lowercase to avoid "Admin" vs "admin" mismatches
    const userRole = req.user.role.toLowerCase();
    const isAllowed = allowedRoles.map(role => role.toLowerCase()).includes(userRole);

    if (!isAllowed) {
      console.log(`Access Denied: User role "${userRole}" not in [${allowedRoles}]`);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};