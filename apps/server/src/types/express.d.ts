// src/types/express.d.ts
import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      id: string;
      email?: string;
      // Add other user fields if needed
    };
  }
}
