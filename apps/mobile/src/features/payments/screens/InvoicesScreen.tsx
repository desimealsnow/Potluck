import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/ui';
import Header from '@/layout/Header';
import { apiClient, Invoice } from '@/services/apiClient';
import { styles } from '../styles/InvoicesScreenStyles';

export default function InvoicesScreen({ onBack }: { onBack?: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { 
      setLoading(true); 
      const data = await apiClient.listInvoices(); 
      setInvoices(Array.isArray(data) ? data : []); 
    } catch (e: any) { 
      Alert.alert('Failed to load', e?.message ?? 'Unknown error'); 
    } finally { 
      setLoading(false); 
    }
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

  // Removed unused bg variable

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header Component */}
        <Header
          onNotifications={() => {}}
          onSettings={() => {}}
          onPlans={() => {}}
          onLogout={() => {}}
          unreadCount={0}
          showNavigation={false}
        />
        
        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Icon name="ChevronLeft" size={20} color="#fff" />
          </Pressable>
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
                <View style={styles.emptyIconContainer}>
                  <Icon name="Receipt" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No Invoices Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your invoices will appear here once you make a purchase or subscription.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


