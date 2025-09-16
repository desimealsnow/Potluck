import type { PaymentContainer } from '../core/container';
import type { CheckoutData } from '../types';

export class PaymentService {
  constructor(private readonly c: PaymentContainer) {}

  async createCheckout(data: CheckoutData & { provider?: string }) {
    const providerName = data.provider ?? 'lemonsqueezy';
    const cfg = await this.c.configs.getConfig(data.tenantId, providerName);
    if (!cfg) throw new Error('Config not found');
    const provider = this.c.providers.get(cfg.provider);
    if (!provider) throw new Error('Unknown provider');

    return this.c.idempotency.withKey(
      `checkout:${data.tenantId}:${data.userId}:${data.planId}`,
      async () => {
        const session = await provider.createCheckoutSession(cfg, data);
        this.c.logger.info('Checkout created', { tenantId: data.tenantId, provider: cfg.provider });
        return session;
      }
    );
  }
}


