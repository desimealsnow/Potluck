import type { PaymentContainer } from '../core/container';
import type { CheckoutData } from '../types';
export declare class PaymentService {
    private readonly c;
    constructor(c: PaymentContainer);
    createCheckout(data: CheckoutData & {
        provider?: string;
    }): Promise<{
        checkoutUrl: string;
        providerSessionId?: string;
    }>;
}
//# sourceMappingURL=paymentService.d.ts.map