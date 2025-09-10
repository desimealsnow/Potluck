import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';
import { handle, ServiceResult } from '../utils/helper';
import { components } from '../../../../libs/common/src/types.gen';

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
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_active', true);
    if (error) return handle(res, err(error.message, '500', error));

    // Cast to API shape
    const plans: BillingPlan[] = (data ?? []).map((p: any) => ({
      id: p.id,
      price_id: p.price_id,
      provider: p.provider,
      name: p.name,
      amount_cents: p.amount_cents,
      currency: p.currency,
      interval: p.interval,
      is_active: p.is_active,
      created_at: p.created_at,
    }));
    return handle(res, ok(plans));
  },

  // POST /billing/checkout/subscription
  async startCheckout(req: Request, res: Response) {
    const { plan_id, provider } = req.body || {};
    if (!plan_id || !provider) {
      return handle(res, err('plan_id and provider are required', '400'));
    }

    // TODO: integrate with provider checkout; return hosted URL
    const session: CheckoutSession = {
      checkout_url: `https://billing.example.com/checkout?plan=${encodeURIComponent(String(plan_id))}&provider=${encodeURIComponent(String(provider))}`,
    };
    return handle(res, ok(session));
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
    const subs: Subscription[] = (data ?? []).map((s: any) => ({
      id: s.id,
      plan_id: s.plan_id,
      provider_subscription_id: s.provider_subscription_id,
      provider: s.provider,
      status: s.status,
      current_period_start: s.start_date ?? s.current_period_start,
      current_period_end: s.current_period_end,
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
    const s: any = data;
    const sub: Subscription = {
      id: s.id,
      plan_id: s.plan_id,
      provider_subscription_id: s.provider_subscription_id,
      provider: s.provider,
      status: s.status,
      current_period_start: s.start_date ?? s.current_period_start,
      current_period_end: s.current_period_end,
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

    const update: Record<string, any> = {};
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
    const rows: PaymentMethod[] = (data ?? []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      provider: m.provider,
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
    const m = data as any;
    const pm: PaymentMethod = {
      id: m.id,
      user_id: m.user_id,
      provider: m.provider,
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
    const m: any = data;
    const pm: PaymentMethod = {
      id: m.id,
      user_id: m.user_id,
      provider: m.provider,
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
    const rows: Invoice[] = (data ?? []).map((i: any) => ({
      id: i.id,
      subscription_id: i.subscription_id ?? undefined,
      user_id: i.user_id,
      invoice_id: i.invoice_id ?? undefined,
      provider: i.provider,
      amount_cents: i.amount_cents,
      currency: i.currency,
      status: i.status,
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
    const i: any = data;
    const row: Invoice = {
      id: i.id,
      subscription_id: i.subscription_id ?? undefined,
      user_id: i.user_id,
      invoice_id: i.invoice_id ?? undefined,
      provider: i.provider,
      amount_cents: i.amount_cents,
      currency: i.currency,
      status: i.status,
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
};

export default BillingController;


