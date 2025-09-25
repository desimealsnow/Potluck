import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Linking, Pressable, FlatList, RefreshControl } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import type { EventItem, EventStatusMobile, Ownership } from '@common/types';
import { EventCard } from './EventCard';

export type TabContentProps = {
  tabKey: EventStatusMobile | 'pending-approval';
  statusTab: EventStatusMobile;
  setStatusTab: (s: EventStatusMobile) => void;
  reloadWith: (s: EventStatusMobile) => void;
  loadingPending: boolean;
  pendingApprovals: any[] | null;
  mapMode: boolean;
  mapPoints: Array<{ id: string; lat: number; lon: number; title?: string }>;
  handleEventPress: (id: string) => void;
  loading: boolean;
  query: string;
  data: EventItem[];
  refreshing: boolean;
  onRefresh: () => void;
  loadMore: () => void;
  endReachedOnce: React.MutableRefObject<boolean>;
  getEventActions: (item: EventItem) => Array<{
    key: string;
    label: string;
    icon: string;
    color: string;
    handler: () => void;
  }>;
};

export function TabContent({
  tabKey,
  statusTab,
  setStatusTab,
  reloadWith,
  loadingPending,
  pendingApprovals,
  mapMode,
  mapPoints,
  handleEventPress,
  loading,
  query,
  data,
  refreshing,
  onRefresh,
  loadMore,
  endReachedOnce,
  getEventActions,
}: TabContentProps) {

  const renderEventCard = useCallback(({ item }: { item: EventItem }) => {
    const actions = getEventActions(item);
    return (
      <EventCard
        item={item}
        onPress={() => handleEventPress(item.id)}
        actions={actions}
      />
    );
  }, [getEventActions, handleEventPress]);

  if (tabKey === 'pending-approval') {
    return (
      <View style={{ flex: 1, backgroundColor: '#351657', paddingHorizontal: 16, paddingTop: 12 }}>
        {loadingPending ? (
          <ActivityIndicator color="#fff" />
        ) : !pendingApprovals || pendingApprovals.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, backgroundColor: '#351657' }}>
            <Icon name="Inbox" size={48} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>No requests</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>When guests request to join your events, they will appear here.</Text>
          </View>
        ) : (
          pendingApprovals.map((req: any) => (
            <View key={req.id} style={{ borderRadius: 18, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: '#fff' }}>
              <Text style={{ fontWeight: '800', color: '#111827' }}>Event: {req.event_id}</Text>
              <Text style={{ marginTop: 4, color: '#374151' }}>Party size: {req.party_size}</Text>
              {req.note ? <Text style={{ marginTop: 4, color: '#6B7280' }} numberOfLines={2}>&quot;{req.note}&quot;</Text> : null}
            </View>
          ))
        )}
      </View>
    );
  }

  if (mapMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#351657', paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ width: '100%', height: 240, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
          <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Icon name="Map" size={48} color="#9CA3AF" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginTop: 12, marginBottom: 8 }}>Map View</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>{mapPoints.length} event{mapPoints.length !== 1 ? 's' : ''} in your area</Text>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#A22AD0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }} onPress={() => {
              if (mapPoints.length > 0) {
                const firstPoint = mapPoints[0];
                const url = `https://www.google.com/maps?q=${firstPoint.lat},${firstPoint.lon}`;
                Linking.openURL(url).catch(() => { Alert.alert('Error', 'Could not open maps'); });
              }
            }}>
              <Icon name="ExternalLink" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 }}>Open in Maps</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          {mapPoints.map(p => (
            <View key={p.id} style={{ borderRadius: 18, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: '#fff' }}>
              <Text style={{ fontWeight: '800', color: '#111827' }}>{p.title || 'Event'}</Text>
              <Text style={{ color: '#374151', marginTop: 2 }}>{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Pressable onPress={() => handleEventPress(p.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#7b2ff7' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Open</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        style={{ marginTop: 10 }}
        refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
        testID="events-list"
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, backgroundColor: '#351657' }} testID="loading-container">
              <ActivityIndicator color="#fff" testID="loading-indicator" />
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 12, fontWeight: '500' }}>Loading events...</Text>
            </View>
          ) : query.length > 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, backgroundColor: '#351657' }} testID="no-search-results">
              <Icon name="Search" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>No events found</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                No events match your search for "{query}". Try adjusting your search terms or filters.
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, backgroundColor: '#351657' }} testID="empty-state">
              <Icon name="Calendar" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>No events yet</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Create your first event to get started!</Text>
            </View>
          )
        }
        renderItem={renderEventCard}
        onEndReachedThreshold={0.01}
        onEndReached={() => {
          if (!endReachedOnce.current) {
            endReachedOnce.current = true;
            return;
          }
          loadMore();
        }}
        ListFooterComponent={loading && data.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color="#fff" testID="load-more-indicator" /> : null}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        removeClippedSubviews
      />
    </View>
  );
}


