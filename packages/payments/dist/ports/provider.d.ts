import type { ProviderConfig } from './config';
import type { Subscription, BillingEvent, CheckoutData } from '../types';
export interface PaymentProvider {
    createCheckoutSession(cfg: ProviderConfig, data: CheckoutData): Promise<{
        checkoutUrl: string;
        providerSessionId?: string;
    }>;
    getSubscription(cfg: ProviderConfig, providerSubId: string): Promise<Subscription>;
    cancelSubscription(cfg: ProviderConfig, providerSubId: string, atPeriodEnd?: boolean): Promise<{
        success: boolean;
    }>;
    verifySignature(cfg: ProviderConfig, rawBody: Buffer, signatureHeader: string): boolean;
    toCanonicalEvents(cfg: ProviderConfig, rawBody: Buffer, headers: Record<string, string>): BillingEvent[];
}
export interface ProviderRegistry {
    get(providerName: string): PaymentProvider | undefined;
}
//# sourceMappingURL=provider.d.ts.map