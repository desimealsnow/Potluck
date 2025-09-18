import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/apiClient";
import EventDetailsPage from "./EventDetailsPage";

type NotificationItem = {
  id: string;
  type: string;
  event_id?: string;
  payload: {
    event_title?: string;
    event_date?: string;
    reason?: string;
    distance_km?: number;
  };
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
      const qs = new URLSearchParams({ limit: String(limit), offset: String(reset ? 0 : offset), status: 'unread' });
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
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    // initial load
    load(true);
  }, [load]);

  useEffect(() => {
    // delayed refresh only when not viewing an event
    if (selectedEventId) return;
    const timer = setTimeout(() => load(true), 1000);
    return () => clearTimeout(timer);
  }, [selectedEventId, load]);

  return (
    <LinearGradient colors={["#7b2ff7", "#ff2d91"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
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
            ListEmptyComponent={<Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>No notifications</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => item.event_id && setSelectedEventId(item.event_id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="notifications" color="#7b2ff7" size={16} />
                  <Text style={{ color: '#111827', fontWeight: '800', marginLeft: 8 }}>{item.payload?.event_title || 'Event update'}</Text>
                </View>
                <Text style={{ color: '#374151' }}>{item.payload?.reason === 'nearby' ? 'Nearby event' : item.type}</Text>
                {typeof item.payload?.distance_km === 'number' && (
                  <Text style={{ color: '#6b7280', marginTop: 4 }}>{item.payload.distance_km} km away</Text>
                )}
              </Pressable>
            )}
            onEndReachedThreshold={0.2}
            onEndReached={() => {
              if (!loading && hasMore && !selectedEventId) load(false);
            }}
            ListHeaderComponent={
              items.length > 0 ? (
                <Pressable
                  onPress={async () => {
                    try {
                      await apiClient.patch(`/discovery/notifications/read-all`);
                      setItems([]);
                      setOffset(0);
                      setHasMore(false);
                    } catch {}
                  }}
                  style={{ alignSelf: 'flex-end', paddingVertical: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Mark all as read</Text>
                </Pressable>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 12, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
  }
});


