const registry = new Map();
export const providerRegistry = {
    get(name) {
        return registry.get(name);
    }
};
export function registerProvider(name, provider) {
    registry.set(name, provider);
}
export function getProviderNames() {
    return Array.from(registry.keys());
}
//# sourceMappingURL=registry.js.map