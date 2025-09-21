import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components';
import { apiClient, PaymentMethod } from '@/services/apiClient';

export default function PaymentMethodsScreen({ onBack }: { onBack?: () => void }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [methodIdInput, setMethodIdInput] = useState('');
  const [provider, setProvider] = useState<'stripe' | 'paypal' | 'razorpay' | 'square' | 'lemonsqueezy'>('stripe');
  const [isDefault, setIsDefault] = useState(false);

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

  const add = useCallback(async () => {
    try {
      if (!methodIdInput.trim()) return;
      await apiClient.addPaymentMethod({ provider, method_id: methodIdInput.trim(), is_default: isDefault });
      setMethodIdInput(''); setIsDefault(false);
      await load();
    } catch (e: any) {
      Alert.alert('Add failed', e?.message ?? 'Unknown error');
    }
  }, [provider, methodIdInput, isDefault, load]);

  const makeDefault = useCallback(async (id: string) => {
    try { await apiClient.setDefaultPaymentMethod(id); await load(); }
    catch (e: any) { Alert.alert('Failed', e?.message ?? 'Unknown error'); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    try { await apiClient.removePaymentMethod(id); await load(); }
    catch (e: any) { Alert.alert('Remove failed', e?.message ?? 'Unknown error'); }
  }, [load]);

  const bg = useMemo(() => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
            <Text style={styles.title}>Payment Methods</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add Payment Method</Text>
            <Text style={styles.label}>Provider</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['stripe','paypal','razorpay','square','lemonsqueezy'] as const).map(p => (
                <Pressable key={p} onPress={() => setProvider(p)} style={[styles.chip, provider === p && styles.chipActive]}>
                  <Text style={[styles.chipText, provider === p && styles.chipTextActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 8 }]}>Provider Method ID</Text>
            <TextInput value={methodIdInput} onChangeText={setMethodIdInput} placeholder="pm_..." style={styles.input} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Pressable onPress={() => setIsDefault(v => !v)} style={[styles.chip, isDefault && styles.chipActive]}>
                <Text style={[styles.chipText, isDefault && styles.chipTextActive]}>{isDefault ? 'Default' : 'Set Default'}</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={add} style={styles.addBtn}><Text style={{ color: '#fff', fontWeight: '800' }}>Add</Text></Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Saved Methods</Text>
            {methods.map(m => (
              <View key={m.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{m.provider} • {m.brand || ''} {m.last_four ? `•••• ${m.last_four}` : ''}</Text>
                  <Text style={styles.rowSub}>{m.is_default ? 'Default' : 'Secondary'}</Text>
                </View>
                {!m.is_default && (
                  <Pressable onPress={() => makeDefault(m.id)} style={[styles.rowBtn, { backgroundColor: '#2563eb' }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Default</Text></Pressable>
                )}
                <Pressable onPress={() => remove(m.id)} style={[styles.rowBtn, { backgroundColor: '#ef4444' }]}><Icon name="Trash2" size={16} color="#fff" /></Pressable>
              </View>
            ))}
            {!methods.length && <Text style={{ color: '#666' }}>{loading ? 'Loading…' : 'No saved payment methods yet'}</Text>}
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
  input: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', color: '#111', marginTop: 6 },
  label: { fontWeight: '700', color: '#333', marginTop: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  chipActive: { backgroundColor: '#111' },
  chipText: { fontWeight: '800', color: '#374151' },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowTitle: { fontWeight: '800', color: '#111' },
  rowSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  rowBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 6 },
  addBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
});

