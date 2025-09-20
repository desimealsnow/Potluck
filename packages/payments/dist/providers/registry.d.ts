import type { PaymentProvider, ProviderRegistry } from '../ports/provider';
export declare const providerRegistry: ProviderRegistry;
export declare function registerProvider(name: string, provider: PaymentProvider): void;
export declare function getProviderNames(): string[];
//# sourceMappingURL=registry.d.ts.map