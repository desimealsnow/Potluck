import { Request, Response, NextFunction } from 'express';
import { TEST_USERS } from '../../tests/setup';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export const mockAuthGuard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Mock token validation - extract user type from token
  if (token.startsWith('mock-jwt-')) {
    const userType = token.split('-')[2]; // Extract user type from mock token
    
    let mockUser;
    switch (userType) {
      case 'host':
        mockUser = TEST_USERS.HOST;
        break;
      case 'participant':
        mockUser = TEST_USERS.PARTICIPANT;
        break;
      case 'outsider':
        mockUser = TEST_USERS.OUTSIDER;
        break;
      case 'admin':
        mockUser = TEST_USERS.ADMIN;
        break;
      default:
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: mockUser.id,
      email: mockUser.email
    };
    
    console.log(`🛡️ mockAuthGuard: authenticated ${userType} (${mockUser.email})`);
    next();
  } else {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};