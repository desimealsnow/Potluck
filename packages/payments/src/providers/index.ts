import { registerProvider } from './registry';
import { lemonSqueezyProvider } from './lemonsqueezy';

// Register built-in providers
registerProvider('lemonsqueezy', lemonSqueezyProvider);

export { lemonSqueezyProvider } from './lemonsqueezy';


