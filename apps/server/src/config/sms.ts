export type SmsProvider = {
  send: (toE164: string, body: string) => Promise<void>;
};

class ConsoleSms implements SmsProvider {
  async send(toE164: string, body: string) {
    console.log(`[SMS] to ${toE164}: ${body}`);
  }
}

class TwilioSms implements SmsProvider {
  private client!: { messages: { create: (args: { to: string; from: string; body: string }) => Promise<unknown> } };
  private from: string;
  constructor() {
    // Lazy require to avoid bundle issues when not installed
    // Use dynamic import to satisfy ESM and lint rules
    type TwilioClient = { messages: { create: (args: { to: string; from: string; body: string }) => Promise<unknown> } };
    type TwilioFactory = (sid: string, token: string) => TwilioClient;
    
    // Initialize with no-op client first
    this.client = { messages: { create: async () => undefined } } as TwilioClient;
    this.from = process.env.TWILIO_FROM_NUMBER!;
    
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        const mod: unknown = await import('twilio' as any).catch(() => null);
        if (mod) {
          const candidate = (mod as { default?: unknown }).default ?? mod;
          if (typeof candidate === 'function') {
            const factory = candidate as TwilioFactory;
            this.client = factory(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
          }
        }
      } catch {
        // Fallback on import error - client already set to no-op
      }
    })();
  }
  async send(toE164: string, body: string) {
    await this.client.messages.create({ to: toE164, from: this.from, body });
  }
}

export function getSmsProvider(): SmsProvider {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return new TwilioSms();
  }
  return new ConsoleSms();
}


