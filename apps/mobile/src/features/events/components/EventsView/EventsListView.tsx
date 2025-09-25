import React from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { EventCard } from '@/features/events/components/EventCard';
import type { EventItem } from '@common/types';

type Props = {
  data: EventItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  endReachedOnceRef: React.MutableRefObject<boolean>;
  onPressItem: (id: string) => void;
  getEventActions: (item: EventItem) => any[];
  query: string;
  styles: any;
};

export default function EventsListView({ data, loading, refreshing, onRefresh, onEndReached, endReachedOnceRef, onPressItem, getEventActions, query, styles }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      style={{ marginTop: 10 }}
      refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
      testID="events-list"
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={11}
      removeClippedSubviews
      ListEmptyComponent={
        loading ? (
          <View style={styles.emptyWrap} testID="loading-container">
            <ActivityIndicator color="#fff" testID="loading-indicator" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : query.length > 0 ? (
          <View style={styles.emptyWrap} testID="no-search-results">
            <Icon name="Search" size={48} color="rgba(255,255,255,0.4)" />
            <Text style={styles.noResultsTitle}>No events found</Text>
            <Text style={styles.noResultsText}>
              No events match your search for "{query}". Try adjusting your search terms or filters.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyWrap} testID="empty-state">
            <Icon name="Calendar" size={48} color="rgba(255,255,255,0.4)" />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>Create your first event to get started!</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <EventCard 
          item={item} 
          onPress={() => onPressItem(item.id)} 
          actions={getEventActions(item)}
          testID={`event-card-${item.id}`}
        />
      )}
      onEndReachedThreshold={0.01}
      onEndReached={() => {
        if (!endReachedOnceRef.current) {
          endReachedOnceRef.current = true;
          return;
        }
        onEndReached();
      }}
      ListFooterComponent={loading && data.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color="#fff" testID="load-more-indicator" /> : null}
    />
  );
}
