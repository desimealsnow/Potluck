export class PaymentService {
    c;
    constructor(c) {
        this.c = c;
    }
    async createCheckout(data) {
        const providerName = data.provider ?? 'lemonsqueezy';
        const cfg = await this.c.configs.getConfig(data.tenantId, providerName);
        if (!cfg)
            throw new Error('Config not found');
        const provider = this.c.providers.get(cfg.provider);
        if (!provider)
            throw new Error('Unknown provider');
        return this.c.idempotency.withKey(`checkout:${data.tenantId}:${data.userId}:${data.planId}`, async () => {
            const session = await provider.createCheckoutSession(cfg, data);
            this.c.logger.info('Checkout created', { tenantId: data.tenantId, provider: cfg.provider });
            return session;
        });
    }
}
//# sourceMappingURL=paymentService.js.map