import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/ui';
import Header from '@/layout/Header';
import { apiClient, UserItem } from '@/services/apiClient';
import { styles } from '../styles/MyItemScreenStyle';

const { width: screenWidth } = Dimensions.get('window');

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
          <Text style={styles.title}>My Items</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={[styles.scrollContainer, { paddingHorizontal: screenWidth < 400 ? 12 : 16 }]}>
          {/* Add New Item Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="Plus" size={20} color="#7b2ff7" />
              <Text style={styles.sectionTitle}>Add New Item</Text>
            </View>
            
            <TextInput 
              placeholder="Item name (e.g., Caesar Salad)" 
              value={name} 
              onChangeText={setName} 
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {['Main Course','Starter','Dessert','Beverage','Side Dish'].map(c => (
                <Pressable 
                  key={c} 
                  onPress={() => setCategory(c)} 
                  style={[styles.chip, category === c && styles.chipActive]}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <Text style={styles.label}>Quantity per guest</Text>
            <TextInput 
              value={qty} 
              onChangeText={t => setQty(t.replace(/[^0-9.]/g, ''))} 
              keyboardType="decimal-pad" 
              style={styles.input}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />
            
            <Pressable onPress={add} style={[styles.addBtn, { opacity: !name.trim() ? 0.6 : 1 }]} disabled={!name.trim()}>
              <Icon name="Plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </Pressable>
          </View>

          {/* Saved Items Card */}
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
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{it.category || 'Uncategorized'}</Text>
                      </View>
                      <Text style={styles.quantityText}>
                        {it.default_per_guest_qty ?? 1} per guest
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => remove(it.id)} style={styles.deleteBtn}>
                    <Icon name="Trash2" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="List" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No Items Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first item template to quickly add items to events.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


