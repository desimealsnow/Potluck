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
  type: string;
  event_id: string;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

/**
 * Send notifications to nearby users when an event is published
 */
export async function notifyNearbyUsers(
  eventId: string,
  eventTitle: string,
  eventDate: string
): Promise<ServiceResult<{ notified_count: number }>> {
  try {
    logger.info(`Sending nearby notifications for event: ${eventId}`);

    // Find nearby users who should be notified
    const { data: nearbyUsers, error: usersError } = await supabase
      .rpc('find_nearby_users_for_notification', { event_id: eventId });

    if (usersError) {
      logger.error('Error finding nearby users:', usersError);
      return { ok: false, error: usersError.message };
    }

    if (!nearbyUsers || nearbyUsers.length === 0) {
      logger.info('No nearby users found for notification');
      return { ok: true, data: { notified_count: 0 } };
    }

    // Get event details for notification payload
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, event_date, city, location_geog')
      .eq('id', eventId)
      .single();

    if (eventError) {
      logger.error('Error fetching event details:', eventError);
      return { ok: false, error: eventError.message };
    }

    // Create notification records
    const notifications = nearbyUsers.map((user: any) => ({
      user_id: user.user_id,
      type: 'event_created',
      event_id: eventId,
      payload: {
        type: 'event_created',
        event_id: eventId,
        reason: 'nearby',
        event_title: eventTitle,
        event_date: eventDate,
        distance_km: Math.round(user.distance_m / 1000 * 10) / 10, // Round to 1 decimal
        city: eventData.city
      } as NotificationPayload
    }));

    // Insert notifications in batch
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (insertError) {
      logger.error('Error inserting notifications:', insertError);
      return { ok: false, error: insertError.message };
    }

    logger.info(`Successfully sent ${insertedNotifications.length} nearby notifications`);
    return { ok: true, data: { notified_count: insertedNotifications.length } };

  } catch (error) {
    logger.error('Error in notifyNearbyUsers:', error);
    return { ok: false, error: 'Failed to send nearby notifications' };
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