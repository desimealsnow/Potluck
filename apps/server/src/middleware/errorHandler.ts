import { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
  const message = (err as Error)?.message || 'Internal Server Error';
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ ok: false, error: message });
};
