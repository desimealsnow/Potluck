import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';

export const signup = async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  const result = await AuthService.signup(email, password, displayName);
  if ('error' in result) return res.status(400).json(result);
  res.status(201).json(result);        // { user, session }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  if ('error' in result) return res.status(401).json(result);
  res.json(result);                    // { user, session }
};

export const logout = async (req: Request, res: Response) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) return res.status(400).json({ error: 'No auth token' });

  const result = await AuthService.logout(accessToken);
  if ('error' in result) return res.status(400).json(result);
  res.json({ message: 'Logged out' });
};
