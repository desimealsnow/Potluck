import { z } from 'zod';

// Lightweight stub for quick build unblock. Every schema resolves to z.any().
// Replace with real schemas by switching imports back to '../validators'.
export const schemas: Record<string, any> = new Proxy({}, {
  get() {
    return z.any();
  }
});

