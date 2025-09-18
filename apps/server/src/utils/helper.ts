import { PostgrestError } from '@supabase/supabase-js';
import { Response }       from 'express';
import {GuardResult} from '../utils/eventGuards';
// Type-only import removed to avoid complex generic type requirement for quick build
// import { PostgrestFilterBuilder } from '@supabase/postgrest-js';


export type ErrorCode = '400' | '401' | '403' | '404' | '409' | '500';
export interface ServiceError {
  ok: false;
  error: string;
  code?: ErrorCode;
  details?: unknown;
  debug?: unknown;
}

/** Success shape */
export interface ServiceSuccess<T> {
  ok: true;
  data: T;
}
export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;
/** Convert `camelCase` to `snake_case`. */
export function camelToSnake(str: string) {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

/** Convert service‑layer error codes to proper HTTP status ints. */
export function httpStatus(code?: string): number {
  switch (code) {
    case '400': return 400;  // bad request / validation
    case '401': return 401;  // unauthenticated
    case '403': return 403;  // forbidden / RLS blocked
    case '404': return 404;  // not found
    case '409': return 409;  // conflict, illegal transition
    default:    return 500;  // internal / unknown
  }
}
/**
 * Convert an arbitrary object’s keys from camelCase → snake_case.
 * Optionally restrict output to an allowed key-set.
 */
export function toDbColumns<T extends Record<string, unknown>>(
  obj: T,
  allowed?: readonly (keyof T)[]
) {
  const dst: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (allowed && !allowed.includes(k as keyof T)) continue;
    dst[camelToSnake(k)] = v;
  }
  return dst;
}
export function mapDbError(err: PostgrestError | null): ServiceError {
  if (!err) return { ok: false, error: 'Unknown DB error', code: '500' };
  let code: ErrorCode = '500';
  switch (err.code) {
    case '23505': // unique_violation
    case '23503': // foreign_key_violation
      code = '409'; break;
    case '42501': // insufficient_privilege (often RLS)
      code = '403'; break;
  }
  return {
    ok: false,
    error: err.message ?? 'DB error',
    code,
    details: {
      db_code: err.code,
      hint: (err as any).hint,
      details: err.details,
    },
  };
}


/** Express helper to unify JSON responses from controllers. */
export function handle<T>(
  res: Response,
  result: ServiceResult<T>,
  successStatus = 200
) {
  /* ✅  Success branch unchanged */
  if (result.ok) {
    return res.status(successStatus).json(result.data);
  }

  /* 🚨  Error branch */
  const errorResult = result as ServiceError;
  const codeStr = errorResult.code ?? '500';
  const status  = httpStatus(codeStr);

  /* base payload */
  const payload: Record<string, unknown> = {
    ok:    false,
    error: errorResult.error,
    code:  codeStr
  };

  /* attach details for server errors; safe to include for visibility */
  if ('details' in result && result.details !== undefined) {
    payload.details = result.details;
  }

  return res.status(status).json(payload);
}


export function guardToService<T>(g: GuardResult<T>): ServiceError {
  // Either discriminator works – choose one
  if (!g.ok) {                         // ← easiest
    const errorGuard = g as { ok: false; error: string; code?: ErrorCode };
    return { ok: false, error: errorGuard.error, code: errorGuard.code };
  }
  // If you somehow call this helper with the success arm, fall back to 500
  return { ok: false, error: 'Unexpected guard success', code: '500' };
}

export function handleResult<T>(res: Response, result: ServiceResult<T>) {
  if (!result.ok) {
    const errorResult = result as ServiceError;
    const status = Number(errorResult.code) || 500;
    return res.status(status).json({ ok: false, error: errorResult.error, code: errorResult.code });
  }
  return res.json(result.data);
}

export async function mustFindOne<T>(
  query: any
): Promise<ServiceResult<T>> {
  const { data, error } = await query.maybeSingle();

  if (error) {
    return { ok: false, error: error.message, code: '500', details: error };
  }
  if (!data) {
    return { ok: false, error: 'Not found', code: '404' };
  }
  return { ok: true, data };
}

export default 'toDbColumns';