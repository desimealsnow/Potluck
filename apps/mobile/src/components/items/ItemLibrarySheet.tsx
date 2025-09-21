import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, Modal, ActivityIndicator } from 'react-native';
import { apiClient, ItemCatalog, UserItem } from '@/services/apiClient';
import { Icon } from '@/components/ui/Icon';

type TabKey = 'catalog' | 'mine';

export interface ItemLibrarySelection {
  name: string;
  category?: string;
  per_guest_qty?: number;
  catalog_item_id?: string;
  user_item_id?: string;
}

export default function ItemLibrarySheet({
  visible,
  onClose,
  onSelect,
  initialTab = 'catalog',
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: ItemLibrarySelection) => void;
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<ItemCatalog[]>([]);
  const [mine, setMine] = useState<UserItem[]>([]);
  const [creating, setCreating] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getItemCatalog({ q: q || undefined, category });
      setCatalog(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  const loadMine = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.listMyItems();
      setMine(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (tab === 'catalog') loadCatalog();
    else loadMine();
  }, [visible, tab, loadCatalog, loadMine]);

  const content = (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.title}>Pick an Item</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Icon name="X" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab('catalog')} style={[styles.tab, tab === 'catalog' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'catalog' && styles.tabTextActive]}>Catalog</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('mine')} style={[styles.tab, tab === 'mine' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>My Items</Text>
        </TouchableOpacity>
      </View>

      {/* Search (catalog only) */}
      {tab === 'catalog' && (
        <View style={styles.searchWrap}>
          <Icon name="Search" size={16} color="#6B7280" />
          <TextInput
            placeholder="Search catalog..."
            placeholderTextColor="#9CA3AF"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={loadCatalog}
            style={styles.searchInput}
          />
          <TouchableOpacity onPress={loadCatalog} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick create (when searching and no exact need to browse) */}
      {q.trim().length >= 2 && (
        <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
          <TouchableOpacity
            disabled={creating}
            style={[styles.row, { borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#F9FAFB' }]}
            onPress={async () => {
              try {
                setCreating(true);
                const name = q.trim();
                const created = await apiClient.createMyItem({ name, default_per_guest_qty: 1 });
                onSelect({ name, per_guest_qty: 1, user_item_id: created.id });
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? (
              <ActivityIndicator color="#6B7280" />
            ) : (
              <Text style={{ fontWeight: '800', color: '#111' }}>Create “{q.trim()}” as My Item</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {loading ? (
          <ActivityIndicator color="#666" />
        ) : tab === 'catalog' ? (
          (catalog || []).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              onPress={() => onSelect({ name: item.name, category: item.category, per_guest_qty: item.default_per_guest_qty, catalog_item_id: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.category || 'Uncategorized'}</Text>
              </View>
              <Text style={styles.rowMeta}>{(item.default_per_guest_qty ?? 1).toString()} / guest</Text>
            </TouchableOpacity>
          ))
        ) : (
          (mine || []).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              onPress={() => onSelect({ name: item.name, category: item.category, per_guest_qty: item.default_per_guest_qty, user_item_id: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.category || 'Uncategorized'}</Text>
              </View>
              <Text style={styles.rowMeta}>{(item.default_per_guest_qty ?? 1).toString()} / guest</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return visible ? (
      <View style={styles.webOverlay}>{content}</View>
    ) : null;
  }
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>{content}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  webOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#111' },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', marginRight: 8 },
  tabActive: { backgroundColor: '#111' },
  tabText: { fontWeight: '700', color: '#374151' },
  tabTextActive: { color: '#fff' },
  searchWrap: { marginHorizontal: 12, marginTop: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', borderRadius: 10, height: 40, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 8, color: '#111' },
  searchBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#111' },
  searchBtnText: { color: '#fff', fontWeight: '800' },
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontWeight: '800', color: '#111' },
  rowSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  rowMeta: { color: '#111', fontWeight: '700' },
});


