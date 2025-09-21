import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components';
import { apiClient, PaginatedJoinRequestsData } from '@/services/apiClient';

export default function MyJoinRequestsScreen({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<PaginatedJoinRequestsData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedJoinRequestsData>(`/events/requests` as any);
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
        <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
            <Text style={styles.title}>My Join Requests</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {(data?.data || []).map(req => (
            <View key={req.id} style={styles.card}>
              <Text style={styles.rowTitle}>Event: {req.event_id}</Text>
              <Text style={styles.rowSub}>Status: {req.status}</Text>
              <Text style={styles.rowSub}>Party size: {req.party_size}</Text>
            </View>
          ))}
          {!data?.data?.length && (
            <Text style={{ color: '#fff' }}>{loading ? 'Loading…' : 'No requests found'}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, marginBottom: 12 },
  rowTitle: { fontWeight: '800', color: '#111' },
  rowSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
});

