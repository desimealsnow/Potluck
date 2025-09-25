import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components';
import Header from '@/components/Header';
import { apiClient, UserItem } from '@/services/apiClient';

const { width: screenWidth } = Dimensions.get('window');

export default function MyItemsScreen({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | undefined>('Main Course');
  const [qty, setQty] = useState<string>('1');

  const load = useCallback(async () => {
    try { setLoading(true); const data = await apiClient.listMyItems(); setItems(Array.isArray(data) ? data : []); }
    catch (e: any) { Alert.alert('Failed to load', e?.message ?? 'Unknown error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async () => {
    try {
      const body = { name: name.trim(), category, default_per_guest_qty: Math.max(0.01, parseFloat(qty || '1') || 1) } as any;
      if (!body.name) return;
      await apiClient.createMyItem(body);
      setName(''); setQty('1'); setCategory('Main Course');
      await load();
    } catch (e: any) { Alert.alert('Create failed', e?.message ?? 'Unknown error'); }
  }, [name, category, qty, load]);

  const remove = useCallback(async (id: string) => { try { await apiClient.deleteMyItem(id); await load(); } catch (e: any) { Alert.alert('Delete failed', e?.message ?? 'Unknown error'); } }, [load]);
  const update = useCallback(async (id: string, patch: Partial<UserItem>) => { try { await apiClient.updateMyItem(id, patch as any); await load(); } catch (e: any) { Alert.alert('Update failed', e?.message ?? 'Unknown error'); } }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
          <Text style={styles.title}>My Items</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={[styles.scrollContainer, { paddingHorizontal: screenWidth < 400 ? 12 : 16 }]}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="Plus" size={20} color="#7b2ff7" />
              <Text style={styles.sectionTitle}>Add New Item</Text>
            </View>
            <TextInput placeholder="Item name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#9CA3AF" />
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {['Main Course','Starter','Dessert','Beverage','Side Dish'].map(c => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Quantity per guest</Text>
            <TextInput value={qty} onChangeText={t => setQty(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={styles.input} placeholder="1" placeholderTextColor="#9CA3AF" />
            <Pressable onPress={add} style={[styles.addBtn, { opacity: !name.trim() ? 0.6 : 1 }]} disabled={!name.trim()}>
              <Icon name="Plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="List" size={20} color="#7b2ff7" />
              <Text style={styles.sectionTitle}>Saved Items</Text>
            </View>
            {items.length > 0 ? (
              items.map((it, index) => (
                <View key={it.id} style={[styles.row, index === items.length - 1 && styles.lastRow]}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.rowTitle}>{it.name}</Text>
                    <View style={styles.itemMeta}>
                      <View style={styles.categoryBadge}><Text style={styles.categoryText}>{it.category || 'Uncategorized'}</Text></View>
                      <Text style={styles.quantityText}>{it.default_per_guest_qty ?? 1} per guest</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => remove(it.id)} style={styles.deleteBtn}><Icon name="Trash2" size={16} color="#ef4444" /></Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}><Icon name="List" size={48} color="#9CA3AF" /></View>
                <Text style={styles.emptyTitle}>No Items Yet</Text>
                <Text style={styles.emptySubtitle}>Create your first item template to quickly add items to events.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: screenWidth < 400 ? 16 : 20, paddingVertical: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: screenWidth < 400 ? 18 : 20, fontWeight: '700', color: '#fff' },
  scrollContainer: { flex: 1, paddingVertical: 16, paddingBottom: 32 },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: screenWidth < 400 ? 12 : 16, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: screenWidth < 400 ? 16 : 18, fontWeight: '800', color: '#111', marginLeft: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: screenWidth < 400 ? 12 : 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, backgroundColor: '#fff', color: '#111', marginTop: 8, fontSize: screenWidth < 400 ? 14 : 16 },
  label: { fontWeight: '700', color: '#374151', marginTop: 16, fontSize: screenWidth < 400 ? 14 : 16 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: screenWidth < 400 ? 6 : 8 },
  chip: { paddingHorizontal: screenWidth < 400 ? 12 : 16, paddingVertical: screenWidth < 400 ? 8 : 10, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#7b2ff7', borderColor: '#7b2ff7' },
  chipText: { fontWeight: '600', color: '#374151', fontSize: screenWidth < 400 ? 12 : 14 },
  chipTextActive: { color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7b2ff7', paddingHorizontal: 20, paddingVertical: screenWidth < 400 ? 12 : 14, borderRadius: 12, marginTop: 16, minHeight: 48 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: screenWidth < 400 ? 14 : 16, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: screenWidth < 400 ? 12 : 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lastRow: { borderBottomWidth: 0 },
  itemInfo: { flex: 1 },
  rowTitle: { fontWeight: '700', color: '#111', fontSize: screenWidth < 400 ? 14 : 16, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontSize: screenWidth < 400 ? 11 : 12, fontWeight: '600', color: '#6B7280' },
  quantityText: { color: '#6B7280', fontSize: screenWidth < 400 ? 11 : 12, fontWeight: '500' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
