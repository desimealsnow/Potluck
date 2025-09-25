import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';
import { handle, ServiceResult } from '../utils/helper';
import { components } from '../../../../libs/common/src/types.gen';
import { createPaymentService } from '../services/payments.container';

type BillingPlan = components['schemas']['BillingPlan'];
type Subscription = components['schemas']['Subscription'];
type SubscriptionUpdate = components['schemas']['SubscriptionUpdate'];
type CheckoutSession = components['schemas']['CheckoutSession'];
type PaymentMethod = components['schemas']['PaymentMethod'];
type PaymentMethodCreate = components['schemas']['PaymentMethodCreate'];
type PaymentMethodUpdate = components['schemas']['PaymentMethodUpdate'];
type Invoice = components['schemas']['Invoice'];

function ok<T>(data: T): ServiceResult<T> { return { ok: true, data }; }
function err<T = never>(error: string, code: '400'|'401'|'403'|'404'|'409'|'500' = '500', details?: unknown): ServiceResult<T> {
  return { ok: false, error, code, details };
}

export const BillingController = {
  // GET /billing/plans
  async listPlans(req: Request, res: Response) {
    try {
      // For LemonSqueezy, fetch plans directly from their API instead of database
      const response = await fetch('https://api.lemonsqueezy.com/v1/products?filter[store_id]=221200', {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      const products = data.data || [];

      // Convert LemonSqueezy products to our plan format
      const plans: BillingPlan[] = [];
      
      for (const product of products) {
        // Get variants for this product
        const variantsResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${product.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
        });

        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          const variants = variantsData.data || [];

          // Create a plan for each variant
          for (const variant of variants) {
            plans.push({
              id: variant.id, // Use variant ID as plan ID
              price_id: variant.id, // Same as ID for LemonSqueezy
              provider: 'lemonsqueezy',
              name: `${product.attributes.name} - ${variant.attributes.name}`,
              amount_cents: Math.round(variant.attributes.price),
              currency: variant.attributes.currency || 'USD',
              interval: variant.attributes.interval || 'year',
              is_active: true,
              created_at: variant.attributes.created_at,
            });
          }
        }
      }

      console.log('📋 Fetched plans from LemonSqueezy:', plans.length);
      return handle(res, ok(plans));
    } catch (error) {
      console.error('❌ Error fetching plans from LemonSqueezy:', error);
      return handle(res, err('Failed to fetch plans', '500'));
    }
  },

  // POST /billing/checkout/subscription
  async startCheckout(req: Request, res: Response) {
    const { plan_id, provider } = req.body || {};
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    
    console.log('🛒 Checkout Request:', {
      plan_id,
      provider,
      userId,
      userEmail,
      userName: (req.user as { name?: string } | undefined)?.name,
    });
    
    if (!plan_id || !provider) {
      return handle(res, err('plan_id and provider are required', '400'));
    }
    
    if (!userId || !userEmail) {
      return handle(res, err('User authentication required', '401'));
    }

    // For LemonSqueezy, plan_id is now the variant ID directly
    // No need to look up in database since we fetch plans from LemonSqueezy API
    console.log('🔧 Using variant ID directly:', plan_id);

    // Use new PaymentService with idempotency and tenant awareness
    const service = createPaymentService();
    // Prefer returning directly to the app so Expo WebBrowser.openAuthSessionAsync can auto-close
    // IMPORTANT: Do NOT mutate the return URL. AuthSession closes only if the
    // final navigated URL starts with the EXACT returnUrl passed to openAuthSessionAsync.
    const appUrl = (req.body?.return_url as string)
      || process.env.MOBILE_WEB_URL
      || 'http://localhost:8081/';
    // For web new-tab flow, send a success interstitial that tries to close and then redirects back
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success.html?redirect=${encodeURIComponent(appUrl)}`;
    const cancelUrl = successUrl;
    const session = await service.createCheckout({
      tenantId: (req.headers['x-tenant-id'] as string) || 'default',
      planId: plan_id,
      userId,
      userEmail,
      userName: (req.user as { name?: string } | undefined)?.name,
      successUrl,
      cancelUrl,
      provider,
    });

    console.log('🛒 Checkout Session:', session);
    return handle(res, ok({ checkout_url: session.checkoutUrl } as unknown as CheckoutSession));
  },

  // GET /billing/subscriptions
  async listMySubscriptions(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId);
    if (error) return handle(res, err(error.message, '500', error));
    const subs: Subscription[] = (data ?? []).map((s: {
      id: string;
      plan_id: string;
      provider_subscription_id: string;
      provider: string;
      status: string;
      start_date?: string | null;
      current_period_start?: string | null;
      current_period_end?: string | null;
      trial_start?: string | null;
      trial_end?: string | null;
      cancel_at_period_end?: boolean | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: s.id,
      plan_id: s.plan_id,
      provider_subscription_id: s.provider_subscription_id,
      provider: s.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      status: s.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired",
      current_period_start: s.start_date ?? s.current_period_start ?? undefined,
      current_period_end: s.current_period_end ?? '',
      trial_start: s.trial_start ?? undefined,
      trial_end: s.trial_end ?? undefined,
      cancel_at_period_end: s.cancel_at_period_end ?? false,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
    return handle(res, ok(subs));
  },

  // GET /billing/subscriptions/:subscriptionId
  async getSubscription(req: Request, res: Response) {
    const userId = req.user?.id;
    const { subscriptionId } = req.params as { subscriptionId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();
    if (error) return handle(res, err(error.message, '500', error));
    if (!data || data.user_id !== userId) return handle(res, err('Not found', '404'));
    const s = data as {
      id: string; plan_id: string; provider_subscription_id: string; provider: string; status: string;
      start_date?: string; current_period_start?: string; current_period_end?: string;
      trial_start?: string | null; trial_end?: string | null; cancel_at_period_end?: boolean;
      created_at: string; updated_at: string;
    };
    const sub: Subscription = {
      id: s.id,
      plan_id: s.plan_id,
      provider_subscription_id: s.provider_subscription_id,
      provider: s.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      status: s.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired",
      current_period_start: s.start_date ?? s.current_period_start!,
      current_period_end: s.current_period_end!,
      trial_start: s.trial_start ?? undefined,
      trial_end: s.trial_end ?? undefined,
      cancel_at_period_end: s.cancel_at_period_end ?? false,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
    return handle(res, ok(sub));
  },

  // PUT /billing/subscriptions/:subscriptionId
  async updateSubscription(req: Request, res: Response) {
    const userId = req.user?.id;
    const { subscriptionId } = req.params as { subscriptionId: string };
    const body = req.body as SubscriptionUpdate;
    if (!userId) return handle(res, err('Unauthorized', '401'));

    const { data: existing, error: exErr } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();
    if (exErr) return handle(res, err(exErr.message, '500', exErr));
    if (!existing || existing.user_id !== userId) return handle(res, err('Not found', '404'));

    const update: Partial<{ cancel_at_period_end: boolean; plan_id: string }> = {};
    if (body.cancel_at_period_end !== undefined) update.cancel_at_period_end = body.cancel_at_period_end;
    if (body.plan_id) update.plan_id = body.plan_id;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update(update)
      .eq('id', subscriptionId)
      .select('*')
      .maybeSingle();
    if (error) return handle(res, err(error.message, '500', error));
    if (!data) return handle(res, err('Not found', '404'));
    return BillingController.getSubscription(req, res);
  },

  // DELETE /billing/subscriptions/:subscriptionId
  async cancelSubscription(req: Request, res: Response) {
    const userId = req.user?.id;
    const { subscriptionId } = req.params as { subscriptionId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data: existing, error: exErr } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();
    if (exErr) return handle(res, err(exErr.message, '500', exErr));
    if (!existing || existing.user_id !== userId) return handle(res, err('Not found', '404'));

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled', cancel_at_period_end: true })
      .eq('id', subscriptionId);
    if (error) return handle(res, err(error.message, '500', error));
    return BillingController.getSubscription(req, res);
  },

  // POST /billing/subscriptions/:subscriptionId/reactivate
  async reactivateSubscription(req: Request, res: Response) {
    const userId = req.user?.id;
    const { subscriptionId } = req.params as { subscriptionId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data: existing, error: exErr } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();
    if (exErr) return handle(res, err(exErr.message, '500', exErr));
    if (!existing || existing.user_id !== userId) return handle(res, err('Not found', '404'));

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'active', cancel_at_period_end: false })
      .eq('id', subscriptionId);
    if (error) return handle(res, err(error.message, '500', error));
    return BillingController.getSubscription(req, res);
  },

  // Payment Methods
  async listPaymentMethods(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);
    if (error) return handle(res, err(error.message, '500', error));
    const rows: PaymentMethod[] = (data ?? []).map((m: {
      id: string; user_id: string; provider: string; method_id: string; is_default: boolean;
      brand?: string | null; last_four?: string | null; exp_month?: number | null; exp_year?: number | null; created_at: string;
    }) => ({
      id: m.id,
      user_id: m.user_id,
      provider: m.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      method_id: m.method_id,
      is_default: m.is_default,
      brand: m.brand ?? undefined,
      last_four: m.last_four ?? undefined,
      exp_month: m.exp_month ?? undefined,
      exp_year: m.exp_year ?? undefined,
      created_at: m.created_at,
    }));
    return handle(res, ok(rows));
  },

  async addPaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const body = req.body as PaymentMethodCreate;
    if (!userId) return handle(res, err('Unauthorized', '401'));
    if (!body?.provider || !body?.method_id) return handle(res, err('provider and method_id are required', '400'));

    // If setting default, unset others first
    if (body.is_default) {
      await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', userId);
    }

    const insertRow = {
      user_id: userId,
      provider: body.provider,
      method_id: body.method_id,
      is_default: !!body.is_default,
    };
    const { data, error } = await supabase
      .from('payment_methods')
      .insert(insertRow)
      .select('*')
      .maybeSingle();
    if (error) return handle(res, err(error.message, '500', error));
    if (!data) return handle(res, err('Insert failed', '500'));
    const m = data as { id: string; user_id: string; provider: string; method_id: string; is_default: boolean; brand?: string | null; last_four?: string | null; exp_month?: number | null; exp_year?: number | null; created_at: string };
    const pm: PaymentMethod = {
      id: m.id,
      user_id: m.user_id,
      provider: m.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      method_id: m.method_id,
      is_default: m.is_default,
      brand: m.brand ?? undefined,
      last_four: m.last_four ?? undefined,
      exp_month: m.exp_month ?? undefined,
      exp_year: m.exp_year ?? undefined,
      created_at: m.created_at,
    };
    return handle(res, ok(pm), 201);
  },

  async getPaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const { methodId } = req.params as { methodId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .maybeSingle();
    if (error) return handle(res, err(error.message, '500', error));
    if (!data || data.user_id !== userId) return handle(res, err('Not found', '404'));
    const m = data as { id: string; user_id: string; provider: string; method_id: string; is_default: boolean; brand?: string | null; last_four?: string | null; exp_month?: number | null; exp_year?: number | null; created_at: string };
    const pm: PaymentMethod = {
      id: m.id,
      user_id: m.user_id,
      provider: m.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      method_id: m.method_id,
      is_default: m.is_default,
      brand: m.brand ?? undefined,
      last_four: m.last_four ?? undefined,
      exp_month: m.exp_month ?? undefined,
      exp_year: m.exp_year ?? undefined,
      created_at: m.created_at,
    };
    return handle(res, ok(pm));
  },

  async updatePaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const { methodId } = req.params as { methodId: string };
    const body = req.body as PaymentMethodUpdate;
    if (!userId) return handle(res, err('Unauthorized', '401'));

    const { data: existing, error: exErr } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .maybeSingle();
    if (exErr) return handle(res, err(exErr.message, '500', exErr));
    if (!existing || existing.user_id !== userId) return handle(res, err('Not found', '404'));

    if (body.is_default) {
      await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_default: !!body.is_default })
      .eq('id', methodId)
      .select('*')
      .maybeSingle();
    if (error) return handle(res, err(error.message, '500', error));
    if (!data) return handle(res, err('Not found', '404'));
    return BillingController.getPaymentMethod(req, res);
  },

  async deletePaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const { methodId } = req.params as { methodId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data: existing, error: exErr } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .maybeSingle();
    if (exErr) return handle(res, err(exErr.message, '500', exErr));
    if (!existing || existing.user_id !== userId) return handle(res, err('Not found', '404'));
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId);
    if (error) return handle(res, err(error.message, '500', error));
    return res.status(204).send();
  },

  async setDefaultPaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const { methodId } = req.params as { methodId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data: existing, error: exErr } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .maybeSingle();
    if (exErr) return handle(res, err(exErr.message, '500', exErr));
    if (!existing || existing.user_id !== userId) return handle(res, err('Not found', '404'));
    await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', userId);
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', methodId);
    if (error) return handle(res, err(error.message, '500', error));
    return BillingController.getPaymentMethod(req, res);
  },

  // Invoices
  async listInvoices(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });
    if (error) return handle(res, err(error.message, '500', error));
    const rows: Invoice[] = (data ?? []).map((i: {
      id: string; subscription_id?: string | null; user_id: string; invoice_id?: string | null; provider: string;
      amount_cents: number; currency: string; status: string; invoice_date: string; paid_date?: string | null; created_at: string;
    }) => ({
      id: i.id,
      subscription_id: i.subscription_id ?? undefined,
      user_id: i.user_id,
      invoice_id: i.invoice_id ?? undefined,
      provider: i.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      amount_cents: i.amount_cents,
      currency: i.currency,
      status: i.status as "draft" | "void" | "open" | "paid" | "uncollectible",
      invoice_date: i.invoice_date,
      paid_date: i.paid_date ?? undefined,
      created_at: i.created_at,
    }));
    return handle(res, ok(rows));
  },

  async getInvoice(req: Request, res: Response) {
    const userId = req.user?.id;
    const { invoiceId } = req.params as { invoiceId: string };
    if (!userId) return handle(res, err('Unauthorized', '401'));
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error) return handle(res, err(error.message, '500', error));
    if (!data || data.user_id !== userId) return handle(res, err('Not found', '404'));
    const i = data as { id: string; subscription_id?: string | null; user_id: string; invoice_id?: string | null; provider: string; amount_cents: number; currency: string; status: string; invoice_date: string; paid_date?: string | null; created_at: string };
    const row: Invoice = {
      id: i.id,
      subscription_id: i.subscription_id ?? undefined,
      user_id: i.user_id,
      invoice_id: i.invoice_id ?? undefined,
      provider: i.provider as "stripe" | "paypal" | "razorpay" | "square" | "lemonsqueezy",
      amount_cents: i.amount_cents,
      currency: i.currency,
      status: i.status as "draft" | "void" | "open" | "paid" | "uncollectible",
      invoice_date: i.invoice_date,
      paid_date: i.paid_date ?? undefined,
      created_at: i.created_at,
    };
    return handle(res, ok(row));
  },

  async downloadInvoice(req: Request, res: Response) {
    const userId = req.user?.id;
    const { invoiceId } = req.params as { invoiceId: string };
    if (!userId) return void res.status(401).send('Unauthorized');
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error || !data || data.user_id !== userId) return void res.status(404).send('Not found');
    // TODO: fetch provider PDF URL; for now return a minimal PDF
    res.setHeader('Content-Type', 'application/pdf');
    const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    return res.status(200).send(minimalPdf);
  },

  // Webhooks are handled by the payments package middleware mounted in routes
};

export default BillingController;


