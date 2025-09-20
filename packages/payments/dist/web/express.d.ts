import type { Request, Response } from 'express';
import type { PaymentContainer } from '../core/container';
export declare function createWebhookHandler(container: PaymentContainer): (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=express.d.ts.map