import { Request, Response, NextFunction } from 'express';

export function routeLogger(routeName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.QUIET_TESTS === 'true') return next();
    console.log(`🔔 Route hit: ${routeName}, User: ${req.user?.id ?? 'Unauthenticated'}`);
    next();
  };
}
export default routeLogger;
