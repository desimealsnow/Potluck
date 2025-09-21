import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabaseClient';
import crypto from 'crypto';
import { getSmsProvider } from '../config/sms';

const SendSchema = z.object({ phone_e164: z.string().regex(/^\+?[1-9]\d{7,14}$/) });
const VerifySchema = z.object({ phone_e164: z.string().regex(/^\+?[1-9]\d{7,14}$/), code: z.string().min(4).max(8) });

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

export async function sendCode(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid phone' });
  const phone = parsed.data.phone_e164.trim();

  // Rate limit: max 5 sends/hour per user
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent, error: recentErr } = await supabase
    .from('phone_verifications')
    .select('id, created_at')
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);
  if (!recentErr && (recent?.length ?? 0) >= 5) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please try later.' });
  }

  // Generate code and store hash with TTL
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  // Upsert verification row
  await supabase
    .from('phone_verifications')
    .insert({ user_id: userId, phone_e164: phone, code_hash: codeHash, expires_at: expiresAt });

  // Send via provider
  try {
    const sms = getSmsProvider();
    await sms.send(phone, `Your Potluck verification code is ${code}. It expires in 10 minutes.`);
  } catch (e) {
    console.log('[SMS] failed to send via provider, falling back to console');
    console.log(`[OTP] For user ${userId} → ${phone}: ${code}`);
  }

  return res.json({ ok: true });
}

export async function verifyCode(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid input' });
  const { phone_e164, code } = parsed.data;

  const { data: rows, error } = await supabase
    .from('phone_verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_e164', phone_e164)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  const row = rows?.[0];
  if (!row) return res.status(400).json({ ok: false, error: 'No verification in progress' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ ok: false, error: 'Code expired' });
  if (row.code_hash !== hashCode(code)) {
    // increment attempts
    await supabase.from('phone_verifications').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return res.status(400).json({ ok: false, error: 'Invalid code' });
  }

  // Update profile
  const { error: upErr } = await supabase
    .from('user_profiles')
    .update({ phone_e164, phone_verified: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (upErr) return res.status(500).json({ ok: false, error: upErr.message });

  return res.json({ ok: true });
}


