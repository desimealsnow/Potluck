import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components';
import { apiClient, UserItem } from '@/services/apiClient';

export default function MyItemsScreen({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | undefined>('Main Course');
  const [qty, setQty] = useState<string>('1');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.listMyItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert('Failed to load', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async () => {
    try {
      const body = {
        name: name.trim(),
        category,
        default_per_guest_qty: Math.max(0.01, parseFloat(qty || '1') || 1),
      };
      if (!body.name) return;
      await apiClient.createMyItem(body as any);
      setName(''); setQty('1'); setCategory('Main Course');
      await load();
    } catch (e: any) {
      Alert.alert('Create failed', e?.message ?? 'Unknown error');
    }
  }, [name, category, qty, load]);

  const remove = useCallback(async (id: string) => {
    try {
      await apiClient.deleteMyItem(id);
      await load();
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message ?? 'Unknown error');
    }
  }, [load]);

  const update = useCallback(async (id: string, patch: Partial<UserItem>) => {
    try {
      await apiClient.updateMyItem(id, patch as any);
      await load();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    }
  }, [load]);

  const bg = useMemo(() => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
            <Text style={styles.title}>My Items</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add New Item</Text>
            <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
            <Text style={styles.label}>Category</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['Main Course','Starter','Dessert'].map(c => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 8 }]}>Per guest qty</Text>
            <TextInput value={qty} onChangeText={t => setQty(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={add} style={styles.addBtn}><Text style={{ color: '#fff', fontWeight: '800' }}>Add</Text></Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Saved Items</Text>
            {items.map(it => (
              <View key={it.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{it.name}</Text>
                  <Text style={styles.rowSub}>{it.category || 'Uncategorized'} • {(it.default_per_guest_qty ?? 1)} / guest</Text>
                </View>
                <Pressable onPress={() => remove(it.id)} style={styles.rowBtn}><Icon name="Trash2" size={16} color="#fff" /></Pressable>
              </View>
            ))}
            {!items.length && <Text style={{ color: '#666' }}>{loading ? 'Loading…' : 'No saved items yet'}</Text>}
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
  rowBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ef4444' },
});

