import { supabase } from '../config/supabaseClient';
import logger from '../logger';
import { ServiceResult } from '../utils/helper';

export interface NotificationPayload {
  type: 'event_created' | 'event_updated' | 'event_cancelled' | 'join_request' | 'join_approved' | 'join_declined';
  event_id: string;
  reason: 'nearby' | 'invited' | 'participant' | 'host';
  event_title?: string;
  event_date?: string;
  distance_km?: number;
  host_name?: string;
  [key: string]: any;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationPayload['type'];
  event_id?: string;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

/**
 * Send notifications to nearby users when an event is published
 * Uses event location latitude/longitude (from locations) – no dependency on events.location_geog
 */
export async function notifyNearbyUsers(
  eventId: string,
  eventTitle: string,
  eventDate: string
): Promise<ServiceResult<{ notified_count: number }>> {
  try {
    logger.info('[Notifications] Start nearby notification', { eventId, eventTitle, eventDate });

    // Load event + location lat/lon
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`id, title, event_date, location_id,
               locations:locations ( id, latitude, longitude, formatted_address )`)
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      logger.error('[Notifications] Fetch event failed', { eventId, error: eventError?.message });
      return { ok: false, error: eventError?.message ?? 'Event not found' };
    }

    const lat = eventData.locations?.latitude as number | null;
    const lon = eventData.locations?.longitude as number | null;
    const radiusKm = 25;

    logger.info('[Notifications] Event location check', { eventId, lat, lon, radiusKm });

    if (lat == null || lon == null) {
      logger.warn('[Notifications] Event has no coordinates; skipping nearby notifications', { eventId });
      return { ok: true, data: { notified_count: 0 } };
    }

    // Find nearby users via lat/lon based RPC
    const { data: nearbyUsers, error: usersError } = await supabase
      .rpc('find_nearby_users_for_latlon', { p_lat: lat, p_lon: lon, p_radius_km: radiusKm });

    if (usersError) {
      logger.error('[Notifications] find_nearby_users_for_latlon failed', { eventId, error: usersError.message });
      return { ok: false, error: usersError.message };
    }

    logger.info('[Notifications] Nearby users result', { eventId, count: (nearbyUsers || []).length });

    if (!nearbyUsers || nearbyUsers.length === 0) {
      return { ok: true, data: { notified_count: 0 } };
    }

    // Build notifications
    const notifications = nearbyUsers.map((user: any) => ({
      user_id: user.user_id,
      type: 'event_created' as const,
      event_id: eventId,
      payload: {
        type: 'event_created',
        event_id: eventId,
        reason: 'nearby',
        event_title: eventTitle,
        event_date: eventDate,
        distance_km: Math.round((user.distance_m / 1000) * 10) / 10,
        city: eventData.locations?.formatted_address ?? null,
      } satisfies NotificationPayload,
    }));

    logger.info('[Notifications] Inserting notifications', { eventId, count: notifications.length });

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      logger.error('[Notifications] Insert failed', { eventId, error: insertError.message });
      return { ok: false, error: insertError.message };
    }

    logger.info('[Notifications] Completed nearby notifications', { eventId, notified_count: notifications.length });
    return { ok: true, data: { notified_count: notifications.length } };

  } catch (error) {
    logger.error('[Notifications] Unexpected failure', { eventId, error: (error as Error)?.message });
    return { ok: false, error: 'Failed to send notifications' };
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ServiceResult<{ notifications: NotificationRecord[], total: number }>> {
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      logger.error('Error counting notifications:', countError);
      return { ok: false, error: countError.message };
    }

    // Get notifications with pagination
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (notificationsError) {
      logger.error('Error fetching notifications:', notificationsError);
      return { ok: false, error: notificationsError.message };
    }

    return { 
      ok: true, 
      data: { 
        notifications: notifications || [], 
        total: count || 0 
      } 
    };

  } catch (error) {
    logger.error('Error in getUserNotifications:', error);
    return { ok: false, error: 'Failed to fetch notifications' };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<ServiceResult<NotificationRecord>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error marking notification as read:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data };

  } catch (error) {
    logger.error('Error in markNotificationAsRead:', error);
    return { ok: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<ServiceResult<{ updated_count: number }>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .select('id');

    if (error) {
      logger.error('Error marking all notifications as read:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { updated_count: data?.length || 0 } };

  } catch (error) {
    logger.error('Error in markAllNotificationsAsRead:', error);
    return { ok: false, error: 'Failed to mark all notifications as read' };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<ServiceResult<{ count: number }>> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      logger.error('Error counting unread notifications:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { count: count || 0 } };

  } catch (error) {
    logger.error('Error in getUnreadNotificationCount:', error);
    return { ok: false, error: 'Failed to count unread notifications' };
  }
}
