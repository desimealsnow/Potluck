import { PostgrestError } from '@supabase/supabase-js';
import { Response }       from 'express';
import {GuardResult} from '../utils/eventGuards';


export type ErrorCode = '400' | '401' | '403' | '404' | '409' | '500';
export interface ServiceError {
  ok: false;
  error: string;
  code?: ErrorCode;
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
    case '23505':
    case '23503':
      code = '409'; break;
    case '42501':
      code = '403'; break;
  }
  return { ok: false, error: err.message ?? 'DB error', code };
}


/** Express helper to unify JSON responses from controllers. */
export function handle<T>(
  res: Response,
  result: ServiceResult<T>,
  successStatus = 200
) {
  if (result.ok) {
    return res.status(successStatus).json(result.data);
  }
  const code = result.code ?? '500';
  return res
    .status(httpStatus(code))
    .json({ ok: false, error: result.error, code });
}


export function guardToService<T>(g: GuardResult<T>): ServiceError {
  // Either discriminator works – choose one
  if (!g.ok) {                         // ← easiest
    return { ok: false, error: g.error, code: g.code };
  }
  // If you somehow call this helper with the success arm, fall back to 500
  return { ok: false, error: 'Unexpected guard success', code: '500' };
}

export function handleResult<T>(res: Response, result: ServiceResult<T>) {
  if (!result.ok) {
    const status = Number(result.code) || 500;
    return res.status(status).json({ ok: false, error: result.error, code: result.code });
  }
  return res.json(result.data);
}

export default 'toDbColumns';