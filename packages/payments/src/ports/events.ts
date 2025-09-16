export interface DomainEventPublisherPort {
  publish(eventName: string, payload: unknown): Promise<void>;
}


