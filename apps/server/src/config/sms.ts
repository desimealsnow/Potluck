export type SmsProvider = {
  send: (toE164: string, body: string) => Promise<void>;
};

class ConsoleSms implements SmsProvider {
  async send(toE164: string, body: string) {
    console.log(`[SMS] to ${toE164}: ${body}`);
  }
}

class TwilioSms implements SmsProvider {
  private client: any;
  private from: string;
  constructor() {
    // Lazy require to avoid bundle issues when not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.from = process.env.TWILIO_FROM_NUMBER!;
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

