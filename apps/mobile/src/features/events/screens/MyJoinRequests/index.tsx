import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components';
import Header from '@/components/Header';
import { apiClient, PaginatedJoinRequestsData } from '@/services/apiClient';

export default function MyJoinRequestsScreen({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<PaginatedJoinRequestsData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedJoinRequestsData>(`/events/requests/all`);
      setData(res);
    } catch (e: any) {
      Alert.alert('Failed to load', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bg = useMemo(() => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Icon name="ChevronLeft" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>My Join Requests</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Requests</Text>
            {data?.data && data.data.length > 0 ? (
              data.data.map(req => (
                <View key={req.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Event: {req.event_id}</Text>
                    <Text style={styles.rowSub}>Status: {req.status}</Text>
                    <Text style={styles.rowSub}>Party size: {req.party_size}</Text>
                    {req.note && (
                      <Text style={styles.rowNote}>Note: {req.note}</Text>
                    )}
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, { color: req.status === 'pending' ? '#f59e0b' : req.status === 'approved' ? '#10b981' : '#ef4444' }]}>
                      {req.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="Send" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No Join Requests</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't made any join requests yet. Browse events to find ones you'd like to join!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowTitle: { fontWeight: '800', color: '#111', fontSize: 16 },
  rowSub: { color: '#6B7280', fontSize: 14, marginTop: 2 },
  rowNote: { color: '#6B7280', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
