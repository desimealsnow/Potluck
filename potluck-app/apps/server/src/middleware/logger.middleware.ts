import { Request, Response, NextFunction } from 'express';

export function routeLogger(routeName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔔 Route hit: ${routeName}, User: ${req.user?.id ?? 'Unauthenticated'}`);
    next();
  };
}
export default routeLogger;
