import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components';
import { apiClient, Invoice } from '@/services/apiClient';

export default function InvoicesScreen({ onBack }: { onBack?: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data = await apiClient.listInvoices(); setInvoices(Array.isArray(data) ? data : []); }
    catch (e: any) { Alert.alert('Failed to load', e?.message ?? 'Unknown error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = useCallback(async (id: string) => {
    try {
      const blob = await apiClient.downloadInvoice(id);
      Alert.alert('Download', `Downloaded invoice ${id} (${blob.size} bytes)`);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message ?? 'Unknown error');
    }
  }, []);

  const bg = useMemo(() => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
            <Text style={styles.title}>Invoices</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My Invoices</Text>
            {invoices.map(inv => (
              <View key={inv.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{inv.provider?.toUpperCase()} • {inv.status?.toUpperCase()} • {inv.amount_cents/100} {inv.currency?.toUpperCase()}</Text>
                  <Text style={styles.rowSub}>{new Date(inv.invoice_date).toLocaleString()}</Text>
                </View>
                <Pressable onPress={() => download(inv.id)} style={[styles.rowBtn, { backgroundColor: '#2563eb' }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>PDF</Text>
                </Pressable>
              </View>
            ))}
            {!invoices.length && <Text style={{ color: '#666' }}>{loading ? 'Loading…' : 'No invoices found'}</Text>}
          </View>
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
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowTitle: { fontWeight: '800', color: '#111' },
  rowSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  rowBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 6 },
});

