import type { ProviderRegistry } from '../ports/provider';
import type { BillingPersistencePort, IdempotencyStore, WebhookInbox } from '../ports/persistence';
import type { DomainEventPublisherPort } from '../ports/events';
import type { Logger } from '../ports/logger';
import type { Metrics } from '../ports/metrics';
import type { ProviderConfigStore } from '../ports/config';
export interface PaymentContainer {
    providers: ProviderRegistry;
    persistence: BillingPersistencePort;
    events: DomainEventPublisherPort;
    logger: Logger;
    metrics?: Metrics;
    configs: ProviderConfigStore;
    inbox: WebhookInbox;
    idempotency: IdempotencyStore;
}
//# sourceMappingURL=container.d.ts.map