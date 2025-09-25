import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components';
import Header from '@/components/Header';
import { apiClient, Invoice } from '@/services/apiClient';

export default function InvoicesScreen({ onBack }: { onBack?: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data = await apiClient.listInvoices(); setInvoices(Array.isArray(data) ? data : []); }
    catch (e: any) { Alert.alert('Failed to load', e?.message ?? 'Unknown error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = useCallback(async (id: string) => {
    try { const blob = await apiClient.downloadInvoice(id); Alert.alert('Download', `Downloaded invoice ${id} (${blob.size} bytes)`); }
    catch (e: any) { Alert.alert('Download failed', e?.message ?? 'Unknown error'); }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
          <Text style={styles.title}>Invoices</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My Invoices</Text>
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <View key={inv.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{inv.provider?.toUpperCase()} • {inv.status?.toUpperCase()} • ${(inv.amount_cents/100).toFixed(2)} {inv.currency?.toUpperCase()}</Text>
                    <Text style={styles.rowSub}>{new Date(inv.invoice_date).toLocaleString()}</Text>
                  </View>
                  <Pressable onPress={() => download(inv.id)} style={styles.downloadBtn}>
                    <Icon name="Download" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}><Icon name="Receipt" size={48} color="#9CA3AF" /></View>
                <Text style={styles.emptyTitle}>No Invoices Yet</Text>
                <Text style={styles.emptySubtitle}>Your invoices will appear here once you make a purchase or subscription.</Text>
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
  downloadBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
