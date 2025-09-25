import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Linking, Pressable, FlatList, RefreshControl, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';
import type { EventItem, EventStatusMobile, Ownership } from '@common/types';
import { EventCard } from './EventCard';
import { vibrantTheme } from '@/theme/vibrant-theme';

const theme = vibrantTheme;

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

export function TabContentVibrant({
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

  // Pending Approvals Tab - More colorful and inviting
  if (tabKey === 'pending-approval') {
    return (
      <LinearGradient
        colors={theme.gradients.card.subtle}
        style={styles.container}
      >
        {loadingPending ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color={theme.colors.primary.main} size="large" />
          </View>
        ) : !pendingApprovals || pendingApprovals.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <LinearGradient
              colors={theme.gradients.card.special}
              style={styles.emptyStateGradient}
            >
              <View style={styles.iconCircle}>
                <Icon name="Inbox" size={48} color={theme.colors.secondary.purple} />
              </View>
              <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
              <Text style={styles.emptyStateDescription}>
                When guests request to join your events, they'll appear here. You'll be notified instantly!
              </Text>
              <View style={styles.decorativeElements}>
                <View style={[styles.floatingCircle, styles.circleTopLeft]} />
                <View style={[styles.floatingCircle, styles.circleBottomRight]} />
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {pendingApprovals.map((req: any) => (
              <Pressable key={req.id} style={styles.requestCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#FFF9F5']}
                  style={styles.requestCardGradient}
                >
                  <View style={styles.requestHeader}>
                    <View style={styles.requestIconContainer}>
                      <Icon name="Users" size={20} color={theme.colors.primary.main} />
                    </View>
                    <Text style={styles.requestEventTitle}>Event #{req.event_id.slice(0, 8)}</Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <View style={styles.detailRow}>
                      <Icon name="Users" size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.detailText}>Party of {req.party_size}</Text>
                    </View>
                    {req.note ? (
                      <View style={styles.noteContainer}>
                        <Icon name="MessageCircle" size={14} color={theme.colors.secondary.blue} />
                        <Text style={styles.noteText} numberOfLines={2}>"{req.note}"</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable style={styles.approveButton}>
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </Pressable>
                    <Pressable style={styles.declineButton}>
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        )}
      </LinearGradient>
    );
  }

  // Map Mode - More vibrant and interactive
  if (mapMode) {
    return (
      <LinearGradient
        colors={theme.gradients.card.subtle}
        style={styles.container}
      >
        <View style={styles.mapContainer}>
          <LinearGradient
            colors={theme.gradients.header.secondary}
            style={styles.mapPlaceholder}
          >
            <View style={styles.mapContent}>
              <View style={styles.mapIconContainer}>
                <Icon name="Map" size={56} color="#FFFFFF" />
              </View>
              <Text style={styles.mapTitle}>Map View</Text>
              <Text style={styles.mapSubtitle}>
                {mapPoints.length} exciting event{mapPoints.length !== 1 ? 's' : ''} near you!
              </Text>
              <Pressable 
                style={styles.openMapButton}
                onPress={() => {
                  if (mapPoints.length > 0) {
                    const firstPoint = mapPoints[0];
                    const url = `https://www.google.com/maps?q=${firstPoint.lat},${firstPoint.lon}`;
                    Linking.openURL(url).catch(() => { 
                      Alert.alert('Error', 'Could not open maps'); 
                    });
                  }
                }}
              >
                <LinearGradient
                  colors={theme.gradients.button.primary}
                  style={styles.openMapButtonGradient}
                >
                  <Icon name="ExternalLink" size={18} color="#FFFFFF" />
                  <Text style={styles.openMapButtonText}>Explore in Maps</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
        
        <View style={styles.mapPointsList}>
          {mapPoints.map(p => (
            <Pressable 
              key={p.id} 
              style={styles.mapPointCard}
              onPress={() => handleEventPress(p.id)}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFF9F5']}
                style={styles.mapPointGradient}
              >
                <View style={styles.mapPointHeader}>
                  <View style={styles.mapPointIcon}>
                    <Icon name="MapPin" size={20} color={theme.colors.primary.main} />
                  </View>
                  <View style={styles.mapPointInfo}>
                    <Text style={styles.mapPointTitle}>{p.title || 'Event'}</Text>
                    <Text style={styles.mapPointCoords}>
                      {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                    </Text>
                  </View>
                </View>
                <Pressable 
                  onPress={() => handleEventPress(p.id)}
                  style={styles.viewEventButton}
                >
                  <Text style={styles.viewEventButtonText}>View Details</Text>
                  <Icon name="ChevronRight" size={16} color={theme.colors.primary.main} />
                </Pressable>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    );
  }

  // Main Events List - Vibrant and engaging
  return (
    <LinearGradient
      colors={theme.gradients.card.subtle}
      style={styles.container}
    >
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            tintColor={theme.colors.primary.main} 
            colors={[theme.colors.primary.main]}
            refreshing={refreshing} 
            onRefresh={onRefresh} 
          />
        }
        testID="events-list"
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer} testID="loading-container">
              <ActivityIndicator 
                color={theme.colors.primary.main} 
                size="large"
                testID="loading-indicator" 
              />
              <Text style={styles.loadingText}>Discovering amazing events...</Text>
            </View>
          ) : query.length > 0 ? (
            <View style={styles.emptyStateCard} testID="no-search-results">
              <LinearGradient
                colors={theme.gradients.card.highlight}
                style={styles.emptyStateGradient}
              >
                <View style={styles.iconCircle}>
                  <Icon name="Search" size={48} color={theme.colors.secondary.blue} />
                </View>
                <Text style={styles.emptyStateTitle}>No Events Found</Text>
                <Text style={styles.emptyStateDescription}>
                  We couldn't find events matching "{query}". Try adjusting your search or create your own event!
                </Text>
                <Pressable style={styles.createEventPrompt}>
                  <LinearGradient
                    colors={theme.gradients.button.primary}
                    style={styles.createEventButton}
                  >
                    <Icon name="Plus" size={20} color="#FFFFFF" />
                    <Text style={styles.createEventButtonText}>Create Event</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.emptyStateCard} testID="empty-state">
              <LinearGradient
                colors={theme.gradients.card.highlight}
                style={styles.emptyStateGradient}
              >
                <View style={styles.celebrationGraphic}>
                  <Icon name="Calendar" size={64} color={theme.colors.secondary.yellow} />
                  <View style={styles.confettiContainer}>
                    <Text style={styles.confetti}>🎉</Text>
                    <Text style={[styles.confetti, styles.confetti2]}>🎊</Text>
                    <Text style={[styles.confetti, styles.confetti3]}>✨</Text>
                  </View>
                </View>
                <Text style={styles.emptyStateTitle}>Ready to Party?</Text>
                <Text style={styles.emptyStateDescription}>
                  Create your first potluck event and bring people together over delicious food!
                </Text>
                <Pressable style={styles.createEventPrompt}>
                  <LinearGradient
                    colors={theme.gradients.button.special}
                    style={styles.createEventButton}
                  >
                    <Icon name="Sparkles" size={20} color="#FFFFFF" />
                    <Text style={styles.createEventButtonText}>Start Your First Event</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
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
        ListFooterComponent={
          loading && data.length > 0 ? (
            <ActivityIndicator 
              style={styles.loadMoreIndicator} 
              color={theme.colors.primary.main}
              testID="load-more-indicator" 
            />
          ) : null
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        removeClippedSubviews
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  
  // Empty States
  emptyStateCard: {
    marginHorizontal: 16,
    marginTop: 40,
  },
  emptyStateGradient: {
    borderRadius: theme.borderRadius.card,
    padding: 32,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  
  // Loading States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sizes.md,
    marginTop: 16,
    fontWeight: theme.typography.weights.medium,
  },
  loadMoreIndicator: {
    marginVertical: 20,
  },
  
  // Request Cards
  requestsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  requestCard: {
    marginBottom: 16,
  },
  requestCardGradient: {
    borderRadius: theme.borderRadius.card,
    padding: 16,
    ...theme.shadows.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestEventTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.secondary,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingLeft: 4,
  },
  noteText: {
    marginLeft: 8,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: theme.colors.state.success,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.base,
  },
  declineButton: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  declineButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.weights.medium,
    fontSize: theme.typography.sizes.base,
  },
  
  // Map View
  mapContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mapPlaceholder: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  mapContent: {
    padding: 32,
    alignItems: 'center',
  },
  mapIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapTitle: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  openMapButton: {
    borderRadius: theme.borderRadius.button,
    overflow: 'hidden',
  },
  openMapButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  openMapButtonText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.base,
    marginLeft: 8,
  },
  
  // Map Points List
  mapPointsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mapPointCard: {
    marginBottom: 12,
  },
  mapPointGradient: {
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  mapPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapPointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mapPointInfo: {
    flex: 1,
  },
  mapPointTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  mapPointCoords: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.muted,
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary.light,
    borderRadius: theme.borderRadius.md,
  },
  viewEventButtonText: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.sm,
    marginRight: 4,
  },
  
  // Decorative Elements
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  floatingCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.1,
  },
  circleTopLeft: {
    top: -20,
    left: -20,
    backgroundColor: theme.colors.secondary.yellow,
  },
  circleBottomRight: {
    bottom: -20,
    right: -20,
    backgroundColor: theme.colors.secondary.blue,
  },
  
  // Celebration Graphics
  celebrationGraphic: {
    position: 'relative',
    marginBottom: 24,
  },
  confettiContainer: {
    position: 'absolute',
    top: -10,
    left: -30,
    right: -30,
    bottom: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    fontSize: 32,
  },
  confetti2: {
    top: -5,
    right: 10,
    transform: [{ rotate: '15deg' }],
  },
  confetti3: {
    bottom: 5,
    left: 10,
    transform: [{ rotate: '-20deg' }],
  },
  
  // Create Event CTA
  createEventPrompt: {
    marginTop: 24,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.button,
  },
  createEventButtonText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.md,
    marginLeft: 8,
  },
});

export default TabContentVibrant;