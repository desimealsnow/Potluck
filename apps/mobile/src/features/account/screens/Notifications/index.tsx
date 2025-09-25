import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components";
import Header from "@/components/Header";
import { apiClient } from "@/services/apiClient";
import EventDetailsPage from "@/features/events/screens/EventDetailsPage";
import { supabase } from "@/config/supabaseClient";

type NotificationItem = {
  id: string;
  type: string;
  event_id?: string;
  payload: { event_title?: string; event_date?: string; reason?: string; distance_km?: number; };
  read_at: string | null;
  created_at: string;
};

export default function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset: boolean = true) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String(reset ? 0 : offset), status: 'all' });
      const res = await apiClient.request<any>(`/discovery/notifications?${qs.toString()}`, { method: 'GET', cache: 'no-store' });
      const list: NotificationItem[] = res.notifications ?? [];
      setItems(prev => (reset ? list : [...prev, ...list]));
      setHasMore(list.length === limit);
      setOffset(prev => (reset ? list.length : prev + list.length));
    } catch (e) {
      if (reset) setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(true); } finally { setRefreshing(false); }
  }, [load]);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    if (selectedEventId) return;
    const timer = setTimeout(() => load(true), 1000);
    return () => clearTimeout(timer);
  }, [selectedEventId, load]);

  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new as any;
        setItems(prev => [{ id: n.id, type: n.type, event_id: n.event_id || undefined, payload: n.payload || {}, read_at: n.read_at, created_at: n.created_at }, ...prev]);
      });
    channel.subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        {selectedEventId ? (
          <EventDetailsPage eventId={selectedEventId} onBack={() => setSelectedEventId(null)} onActionCompleted={() => setSelectedEventId(null)} />
        ) : loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}><Icon name="Bell" size={48} color="#9CA3AF" /></View>
                <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                <Text style={styles.emptySubtitle}>We'll notify you about new events, updates, and important announcements here.</Text>
                <View style={styles.emptyActions}>
                  <Pressable style={styles.emptyActionButton} onPress={() => { onRefresh(); }}>
                    <Icon name="RefreshCw" size={16} color="#fff" />
                    <Text style={styles.emptyActionText}>Refresh</Text>
                  </Pressable>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => item.event_id && setSelectedEventId(item.event_id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="Bell" color="#7b2ff7" size={16} />
                  <Text style={{ color: '#111827', fontWeight: '800', marginLeft: 8 }}>{item.payload?.event_title || 'Event update'}</Text>
                </View>
                <Text style={{ color: '#374151' }}>{item.payload?.reason === 'nearby' ? 'Nearby event' : item.type}</Text>
                {typeof item.payload?.distance_km === 'number' && (
                  <Text style={{ color: '#6b7280', marginTop: 4 }}>{item.payload.distance_km} km away</Text>
                )}
              </Pressable>
            )}
            onEndReachedThreshold={0.2}
            onEndReached={() => { if (!loading && hasMore && !selectedEventId) load(false); }}
            ListHeaderComponent={items.length > 0 ? (
              <Pressable onPress={async () => { try { await apiClient.patch(`/discovery/notifications/read-all`); setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))); } catch {} }} style={{ alignSelf: 'flex-end', paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Mark all as read</Text>
              </Pressable>
            ) : null}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64, minHeight: 400 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  emptySubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  emptyActions: { flexDirection: 'row', gap: 12 },
  emptyActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  emptyActionText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
