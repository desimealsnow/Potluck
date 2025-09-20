export interface DomainEventPublisherPort {
    publish(eventName: string, payload: unknown): Promise<void>;
}
//# sourceMappingURL=events.d.ts.map