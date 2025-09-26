import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/ui';
import Header from '@/layout/Header';
import { apiClient, PaymentMethod } from '@/services/apiClient';
import { styles } from '../styles/PaymentMethodsScreenStyles';

export default function PaymentMethodsScreen({ onBack }: { onBack?: () => void }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.listPaymentMethods();
      setMethods(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert('Failed to load', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPaymentMethod = useCallback(async () => {
    try {
      // In a real app, this would open a payment method setup flow
      Alert.alert('Add Payment Method', 'Payment method setup will be implemented with a proper payment provider integration.');
    } catch (e: any) {
      Alert.alert('Add failed', e?.message ?? 'Unknown error');
    }
  }, []);

  const makeDefault = useCallback(async (id: string) => {
    try { 
      await apiClient.setDefaultPaymentMethod(id); 
      await load(); 
    } catch (e: any) { 
      Alert.alert('Failed', e?.message ?? 'Unknown error'); 
    }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    try { 
      await apiClient.removePaymentMethod(id); 
      await load(); 
    } catch (e: any) { 
      Alert.alert('Remove failed', e?.message ?? 'Unknown error'); 
    }
  }, [load]);

  const bg = useMemo(() => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, []);

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
          <Text style={styles.title}>Payment Methods</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Add Payment Method Button */}
          <Pressable style={styles.addCard} onPress={addPaymentMethod}>
            <Icon name="Plus" size={20} color="#7b2ff7" />
            <Text style={styles.addCardText}>Add Payment Method</Text>
          </Pressable>

          {/* Payment Methods List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Saved Methods</Text>
            {methods.length > 0 ? (
              methods.map(m => (
                <View key={m.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{m.type?.toUpperCase()} •••• {m.last_four}</Text>
                    <Text style={styles.rowSub}>{m.brand} • {m.is_default ? 'Default' : 'Not default'}</Text>
                  </View>
                  <View style={styles.rowActions}>
                    {!m.is_default && (
                      <Pressable onPress={() => makeDefault(m.id)} style={styles.actionBtn}>
                        <Icon name="Star" size={16} color="#7b2ff7" />
                      </Pressable>
                    )}
                    <Pressable onPress={() => remove(m.id)} style={styles.actionBtn}>
                      <Icon name="Trash2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="CreditCard" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No Payment Methods</Text>
                <Text style={styles.emptySubtitle}>
                  Add a payment method to make purchases and manage your subscription.
                </Text>
                <Pressable style={styles.emptyActionButton} onPress={addPaymentMethod}>
                  <Icon name="Plus" size={16} color="#fff" />
                  <Text style={styles.emptyActionText}>Add Payment Method</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


