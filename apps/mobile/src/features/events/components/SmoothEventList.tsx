import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView, AnimatePresence } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { EventCardEnhanced } from './EventCardEnhanced';
import { Icon } from '@/components/ui/Icon';
import { vibrantTheme } from '@/theme/vibrant-theme';
import { rw, rh, rf, rs, getResponsiveStyles, isTablet } from '@/utils/responsive';
import type { EventItem } from '@common/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const theme = vibrantTheme;
const responsive = getResponsiveStyles();

interface SmoothEventListProps {
  data: EventItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onEventPress: (id: string) => void;
  getEventActions: (item: EventItem) => any[];
  emptyMessage?: string;
  searchQuery?: string;
  ListHeaderComponent?: React.ComponentType<any>;
}

// Skeleton Loading Card
function SkeletonCard({ index }: { index: number }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 400,
        delay: index * 100,
      }}
      style={styles.skeletonCard}
    >
      <Skeleton 
        colorMode="light" 
        radius={rs(20)}
        height={rh(180)}
        width={'100%'}
      />
    </MotiView>
  );
}

// Empty State with Animations
function EmptyState({ message, searchQuery }: { message?: string; searchQuery?: string }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15 }}
      style={styles.emptyContainer}
    >
      <LinearGradient
        colors={theme.gradients.card.highlight}
        style={styles.emptyCard}
      >
        {Platform.OS === 'ios' && (
          <BlurView 
            intensity={30} 
            tint="light" 
            style={StyleSheet.absoluteFillObject} 
          />
        )}
        
        <Animated.View 
          style={[
            styles.emptyIconContainer,
            { transform: [{ translateY: bounceAnim }] }
          ]}
        >
          <Animated.View
            style={{
              transform: [{
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }}
          >
            <Icon 
              name={searchQuery ? "Search" : "Calendar"} 
              size={rf(64)} 
              color={theme.colors.secondary.yellow} 
            />
          </Animated.View>
        </Animated.View>
        
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
        >
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No Events Found' : 'Ready to Party?'}
          </Text>
          <Text style={styles.emptyDescription}>
            {searchQuery 
              ? `No events match "${searchQuery}". Try different search terms!`
              : message || 'Create your first potluck event and bring people together!'}
          </Text>
        </MotiView>
        
        {/* Floating Decorative Elements */}
        <MotiView
          from={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 400 }}
          style={styles.floatingEmoji1}
        >
          <Text style={styles.emoji}>🎉</Text>
        </MotiView>
        
        <MotiView
          from={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 500 }}
          style={styles.floatingEmoji2}
        >
          <Text style={styles.emoji}>🎊</Text>
        </MotiView>
        
        <MotiView
          from={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 600 }}
          style={styles.floatingEmoji3}
        >
          <Text style={styles.emoji}>✨</Text>
        </MotiView>
        
        <Pressable style={styles.createButton}>
          <LinearGradient
            colors={theme.gradients.button.special}
            style={styles.createButtonGradient}
          >
            <Icon name="Plus" size={rf(20)} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </MotiView>
  );
}

// Loading Footer
function LoadingFooter({ loading }: { loading: boolean }) {
  if (!loading) return null;
  
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.loadingFooter}
    >
      <ActivityIndicator 
        size="large" 
        color={theme.colors.primary.main}
      />
      <Text style={styles.loadingText}>Loading more events...</Text>
    </MotiView>
  );
}

export function SmoothEventList({
  data,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  onEventPress,
  getEventActions,
  emptyMessage,
  searchQuery,
  ListHeaderComponent,
}: SmoothEventListProps) {
  const listRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Optimized render item with memoization
  const renderItem = useCallback(({ item, index }: { item: EventItem; index: number }) => {
    const actions = getEventActions(item);
    
    return (
      <AnimatePresence>
        <MotiView
          from={{ opacity: 0, translateX: -50 }}
          animate={{ opacity: 1, translateX: 0 }}
          exit={{ opacity: 0, translateX: 50 }}
          transition={{
            type: 'timing',
            duration: 350,
            delay: index * 50,
          }}
        >
          <EventCardEnhanced
            item={item}
            onPress={() => onEventPress(item.id)}
            actions={actions}
            index={index}
            testID={`event-card-${index}`}
          />
        </MotiView>
      </AnimatePresence>
    );
  }, [getEventActions, onEventPress]);
  
  // Key extractor
  const keyExtractor = useCallback((item: EventItem) => item.id, []);
  
  // Handle end reached with debounce
  const handleEndReached = useCallback(() => {
    if (!loadingMore && data.length > 0) {
      setLoadingMore(true);
      onLoadMore();
      setTimeout(() => setLoadingMore(false), 1000);
    }
  }, [loadingMore, data.length, onLoadMore]);
  
  // Optimized getItemLayout for better performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: rh(200), // Approximate height of each card
    offset: rh(200) * index,
    index,
  }), []);
  
  // Pull to refresh with custom colors
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary.main}
      colors={[theme.colors.primary.main, theme.colors.secondary.blue]}
      progressBackgroundColor="#FFFFFF"
      progressViewOffset={rh(20)}
    />
  ), [refreshing, onRefresh]);
  
  // Show skeleton loading
  if (loading && data.length === 0) {
    return (
      <View style={styles.container}>
        {[0, 1, 2, 3].map((index) => (
          <SkeletonCard key={index} index={index} />
        ))}
      </View>
    );
  }
  
  // Show empty state
  if (!loading && data.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState message={emptyMessage} searchQuery={searchQuery} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={refreshControl}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={<LoadingFooter loading={loadingMore} />}
        ListEmptyComponent={
          <EmptyState message={emptyMessage} searchQuery={searchQuery} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        
        // Performance optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        windowSize={10}
        updateCellsBatchingPeriod={100}
        getItemLayout={getItemLayout}
        
        // Smooth scrolling
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        
        // Tablet optimizations
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.tabletColumns : undefined}
        
        // Accessibility
        accessibilityRole="list"
        accessibilityLabel="Events list"
      />
      
      {/* Floating Action Button for tablets */}
      {isTablet && (
        <MotiView
          from={{ scale: 0, rotate: '0deg' }}
          animate={{ scale: 1, rotate: '360deg' }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.fab}
        >
          <Pressable style={styles.fabButton}>
            <LinearGradient
              colors={theme.gradients.button.primary}
              style={styles.fabGradient}
            >
              <Icon name="Plus" size={rf(24)} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  listContent: {
    paddingHorizontal: responsive.containerPadding,
    paddingBottom: rh(100),
    paddingTop: rh(12),
  },
  tabletColumns: {
    justifyContent: 'space-between',
    paddingHorizontal: rw(8),
  },
  
  // Skeleton
  skeletonCard: {
    marginHorizontal: responsive.containerPadding,
    marginVertical: rh(10),
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsive.containerPadding,
    paddingVertical: rh(60),
  },
  emptyCard: {
    borderRadius: rs(24),
    padding: rs(32),
    alignItems: 'center',
    width: '100%',
    maxWidth: rw(400),
    overflow: 'hidden',
  },
  emptyIconContainer: {
    marginBottom: rh(24),
  },
  emptyTitle: {
    fontSize: responsive.fontSize['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: rh(12),
  },
  emptyDescription: {
    fontSize: responsive.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: rf(22),
    paddingHorizontal: rw(16),
    marginBottom: rh(24),
  },
  
  // Floating Emojis
  floatingEmoji1: {
    position: 'absolute',
    top: rh(20),
    left: rw(20),
  },
  floatingEmoji2: {
    position: 'absolute',
    top: rh(40),
    right: rw(30),
  },
  floatingEmoji3: {
    position: 'absolute',
    bottom: rh(80),
    left: rw(40),
  },
  emoji: {
    fontSize: rf(32),
  },
  
  // Create Button
  createButton: {
    marginTop: rh(16),
    borderRadius: rs(25),
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rw(24),
    paddingVertical: rh(14),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.md,
    fontWeight: theme.typography.weights.bold,
    marginLeft: rw(8),
  },
  
  // Loading Footer
  loadingFooter: {
    paddingVertical: rh(20),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: rh(8),
    fontSize: responsive.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  
  // FAB for tablets
  fab: {
    position: 'absolute',
    bottom: rh(24),
    right: rw(24),
  },
  fabButton: {
    borderRadius: rs(32),
    overflow: 'hidden',
  },
  fabGradient: {
    width: rs(64),
    height: rs(64),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SmoothEventList;