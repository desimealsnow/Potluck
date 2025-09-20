import type { Request, Router as ExpressRouter } from 'express';
import type { PaymentContainer } from '../core/container';
export interface DevRoutesOptions {
    getUserId?: (req: Request) => string | undefined;
    getUserEmail?: (req: Request) => string | undefined;
}
/**
 * Create dev/test-only helper routes backed by the PaymentContainer ports.
 * Host apps can mount under any base path and provide how to read user identity.
 */
export declare function createDevPaymentsRoutes(container: PaymentContainer, opts?: DevRoutesOptions): ExpressRouter;
//# sourceMappingURL=dev.d.ts.map