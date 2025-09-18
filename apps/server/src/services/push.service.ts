import logger from '../logger';
import { supabase } from '../config/supabaseClient';

export type DeliveryChannel = 'in_app' | 'push' | 'email';

export type DeliveryPayload = {
  title?: string;
  body?: string;
  data?: Record<string, any>;
  deepLink?: string;
};

/**
 * Enqueue or immediately deliver a push/email (stubbed).
 * For now, we look up push tokens for the user and log a delivery event.
 */
export async function enqueueDelivery(
  userId: string,
  payload: DeliveryPayload
): Promise<void> {
  try {
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('platform, token')
      .eq('user_id', userId);
    if (error) {
      logger.warn('[Push] Failed to load tokens', { userId, error: error.message });
      return;
    }
    (tokens || []).forEach(t => {
      logger.info('[Push] Would send notification', {
        userId,
        platform: t.platform,
        token: (t.token || '').slice(0, 12) + '…',
        title: payload.title,
        body: payload.body,
        deepLink: payload.deepLink,
      });
    });
  } catch (err) {
    logger.warn('[Push] enqueueDelivery exception', { userId, err: (err as Error)?.message });
  }
}

