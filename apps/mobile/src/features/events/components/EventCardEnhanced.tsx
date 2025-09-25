import React, { useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  Platform, 
  Animated,
  LayoutAnimation,
  UIManager,
  Vibration,
  AccessibilityInfo
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/ui/Icon';
import { formatDateTimeRange } from '@/utils/dateUtils';
import { vibrantTheme } from '@/theme/vibrant-theme';
import { rw, rh, rf, rs, getResponsiveStyles, shadows } from '@/utils/responsive';
import type { EventItem, Attendee, Diet } from '@common/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const theme = vibrantTheme;
const responsive = getResponsiveStyles();

// Animated Diet Tag with spring animation
function DietTag({ diet }: { diet: Diet }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dietConfig = {
    veg: {
      gradient: ['#95E1A4', '#6BCF7F'],
      icon: '🥗',
      label: 'Vegetarian',
      textColor: '#2D5F3F',
      blur: 'light',
    },
    nonveg: {
      gradient: ['#FFB088', '#FF8E53'],
      icon: '🍖',
      label: 'Non-Veg',
      textColor: '#8B4513',
      blur: 'light',
    },
    mixed: {
      gradient: ['#B4A7D6', '#9F7AEA'],
      icon: '🍽️',
      label: 'Mixed',
      textColor: '#4A3C6B',
      blur: 'light',
    },
  } as const;
  
  const config = dietConfig[diet];
  
  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };
  
  return (
    <Animated.View style={[animatedStyle]}>
      <LinearGradient
        colors={config.gradient}
        style={styles.dietTag}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={20} tint={config.blur as any} style={StyleSheet.absoluteFillObject} />
        )}
        <Text style={styles.dietIcon}>{config.icon}</Text>
        <Text style={[styles.dietLabel, { color: config.textColor }]}>{config.label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// Enhanced Status Pill with pulse animation
function StatusPill({ status, testID }: { status: 'active' | 'cancelled' | 'draft' | 'deleted' | 'past'; testID?: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [status]);

  const statusConfig = {
    active: {
      gradient: ['#95E1A4', '#6BCF7F'],
      icon: 'CircleCheck' as const,
      label: 'Active',
      emoji: '✨',
      pulse: true,
    },
    cancelled: {
      gradient: ['#FFB4B4', '#FC5C65'],
      icon: 'CircleX' as const,
      label: 'Cancelled',
      emoji: '❌',
      pulse: false,
    },
    draft: {
      gradient: ['#FFD93D', '#FFB088'],
      icon: 'Pencil' as const,
      label: 'Draft',
      emoji: '📝',
      pulse: false,
    },
    deleted: {
      gradient: ['#CBD5E0', '#A0AEC0'],
      icon: 'Trash2' as const,
      label: 'Deleted',
      emoji: '🗑️',
      pulse: false,
    },
    past: {
      gradient: ['#B4A7D6', '#9F7AEA'],
      icon: 'Clock' as const,
      label: 'Past',
      emoji: '⏰',
      pulse: false,
    },
  };
  
  const config = statusConfig[status] || statusConfig.active;
  
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <LinearGradient
        colors={config.gradient}
        style={styles.statusPill}
        testID={testID}
      >
        <Text style={styles.statusEmoji}>{config.emoji}</Text>
        <Text style={styles.statusLabel} testID={`${testID}-text`}>{config.label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// Enhanced Avatars with Image loading
function Avatars({ people, extra }: { people: Attendee[]; extra?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const avatarColors = [
    theme.colors.primary.main,
    theme.colors.secondary.blue,
    theme.colors.secondary.purple,
    theme.colors.secondary.green,
  ];
  
  return (
    <Animated.View style={[styles.avatarsContainer, { opacity: fadeAnim }]}>
      {people.slice(0, 3).map((p, idx) => (
        <View 
          key={p.id} 
          style={[
            styles.avatarWrapper,
            { 
              marginLeft: idx === 0 ? 0 : rs(-12),
              zIndex: 3 - idx,
            }
          ]}
        >
          {p.avatarUrl ? (
            <Image
              source={{ uri: p.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
              placeholder={require('@/assets/avatar-placeholder.png')}
            />
          ) : (
            <LinearGradient
              colors={[avatarColors[idx % avatarColors.length], avatarColors[(idx + 1) % avatarColors.length]]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitial}>
                {p.name ? p.name[0].toUpperCase() : 'G'}
              </Text>
            </LinearGradient>
          )}
        </View>
      ))}
      {extra && extra > 0 ? (
        <LinearGradient
          colors={theme.gradients.button.special}
          style={[styles.avatarWrapper, styles.extraAvatar]}
        >
          <Text style={styles.avatarExtra}>+{extra}</Text>
        </LinearGradient>
      ) : null}
    </Animated.View>
  );
}

export type EventCardAction = {
  key: string;
  label: string;
  icon: string;
  color: string;
  handler: () => void;
};

export type EventCardProps = {
  item: EventItem;
  onPress: () => void;
  actions?: EventCardAction[];
  testID?: string;
  index?: number;
};

function EventCardEnhanced({ item, onPress, actions = [], testID, index = 0 }: EventCardProps) {
  const dateLabel = formatDateTimeRange(new Date(item.date), item.time ? new Date(item.time) : undefined);
  const roleLabel = item.ownership === 'mine' ? 'host' : 'guest';
  const isHost = item.ownership === 'mine';
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Entrance animation
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);
  
  // Press handlers with haptic feedback
  const handlePressIn = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(10);
    }
    
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(`Opening ${item.title} event`);
    
    onPress();
  }, [item.title, onPress]);
  
  // Memoized gradient based on role
  const headerGradient = useMemo(() => 
    isHost ? theme.gradients.header.primary : theme.gradients.header.secondary,
    [isHost]
  );
  
  const animatedCardStyle = {
    opacity: fadeAnim,
    transform: [
      { translateY: slideAnim },
      { scale: scaleAnim },
    ],
  };
  
  return (
    <Animated.View style={[animatedCardStyle, { marginVertical: rh(10) }]}>
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID} 
        accessibilityRole="button" 
        accessibilityLabel={`${item.title} event on ${dateLabel}. You are ${roleLabel}. ${item.attendeeCount} attendees.`}
        accessibilityHint="Double tap to open event details"
      >
        <View style={styles.cardContainer}>
          {/* Main Card with Blur Background on iOS */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={95} tint="light" style={styles.card}>
              <CardContent />
            </BlurView>
          ) : (
            <View style={styles.card}>
              <LinearGradient
                colors={['#FFFFFF', '#FFF9F5']}
                style={StyleSheet.absoluteFillObject}
              />
              <CardContent />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
  
  // Inner component to avoid duplication
  function CardContent() {
    return (
      <>
        {/* Decorative Header Gradient */}
        <LinearGradient
          colors={headerGradient}
          style={styles.headerAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        
        {/* Card Header */}
        <View style={styles.cardHeader} testID={`${testID}-header`}>
          <View style={styles.titleContainer}>
            <Text 
              style={styles.cardTitle} 
              testID={`${testID}-title`} 
              numberOfLines={2}
              accessibilityRole="header"
            >
              {item.title}
            </Text>
            <View style={styles.roleIndicator}>
              <LinearGradient
                colors={isHost ? ['#FFD93D', '#FFB088'] : ['#4ECDC4', '#95E1A4']}
                style={styles.roleBadge}
              >
                <Icon 
                  name={isHost ? 'Crown' : 'Users'} 
                  size={rf(12)} 
                  color="#FFFFFF" 
                />
                <Text style={styles.roleText}>{roleLabel}</Text>
              </LinearGradient>
            </View>
          </View>
          {item.statusBadge && (
            <StatusPill status={item.statusBadge} testID={`${testID}-status`} />
          )}
        </View>
        
        {/* Event Details with Icons */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icon name="Calendar" size={rf(16)} color={theme.colors.secondary.blue} />
            </View>
            <Text style={styles.detailText} accessibilityLabel={`Date: ${dateLabel}`}>
              {dateLabel}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icon name="MapPin" size={rf(16)} color={theme.colors.primary.main} />
            </View>
            <Text 
              style={styles.detailText} 
              numberOfLines={1}
              accessibilityLabel={`Location: ${item.venue}`}
            >
              {item.venue}
            </Text>
          </View>
        </View>
        
        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.attendeeSection}>
            <View style={styles.attendeeCount}>
              <Icon name="Users" size={rf(16)} color={theme.colors.secondary.purple} />
              <Text style={styles.attendeeText}>{item.attendeeCount} going</Text>
            </View>
            <Avatars
              people={item.attendeesPreview || []}
              extra={Math.max(0, (item.attendeeCount || 0) - (item.attendeesPreview?.length || 0))}
            />
          </View>
          
          <DietTag diet={item.diet} />
        </View>
        
        {/* Action Buttons with Animations */}
        {actions.length > 0 && (
          <View style={styles.actionsContainer} testID={`${testID}-actions`}>
            {actions.map((action, actionIndex) => (
              <ActionButton 
                key={action.key} 
                action={action} 
                index={actionIndex}
                testID={`${testID}-action-${action.key}`}
              />
            ))}
          </View>
        )}
        
        {/* Decorative Elements */}
        <Animated.View 
          style={[
            styles.decorativeCorner,
            {
              transform: [{
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                })
              }]
            }
          ]} 
        />
        <View style={styles.decorativeCorner2} />
      </>
    );
  }
}

// Animated Action Button Component
function ActionButton({ action, index, testID }: { action: EventCardAction; index: number; testID: string }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index]);
  
  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    action.handler();
  }, [action]);
  
  const actionGradients: Record<string, readonly [string, string, ...string[]]> = {
    'publish': theme.gradients.button.success,
    'delete': ['#FFB4B4', '#FC5C65'] as readonly [string, string, ...string[]],
    'cancel': ['#FFB088', '#FF8E53'] as readonly [string, string, ...string[]],
    'complete': theme.gradients.button.secondary,
    'restore': theme.gradients.button.primary,
  };
  
  const gradient = actionGradients[action.key] || theme.gradients.button.primary;
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={styles.actionButtonWrapper}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${action.label} event`}
      >
        <LinearGradient
          colors={gradient}
          style={styles.actionButton}
        >
          <Icon 
            name={
              action.icon === 'rocket-outline' ? 'Rocket' :
              action.icon === 'trash-outline' ? 'Trash2' :
              action.icon === 'close-circle-outline' ? 'CircleX' :
              action.icon === 'checkmark-circle-outline' ? 'CircleCheck' :
              action.icon === 'refresh-outline' ? 'RefreshCw' : 'Circle'
            } 
            size={rf(14)} 
            color="#FFFFFF" 
          />
          <Text style={styles.actionButtonText} testID={`${testID}-text`}>
            {action.label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const MemoizedEventCardEnhanced = React.memo(EventCardEnhanced);
export { MemoizedEventCardEnhanced as EventCardEnhanced };

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: rw(2),
    ...shadows.lg,
  },
  card: {
    borderRadius: rs(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    minHeight: rh(180),
  },
  headerAccent: {
    height: rh(4),
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: rw(16),
    paddingTop: rh(16),
    paddingBottom: rh(12),
  },
  titleContainer: {
    flex: 1,
    marginRight: rw(12),
  },
  cardTitle: {
    color: theme.colors.text.primary,
    fontSize: responsive.fontSize.xl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: rh(8),
    lineHeight: rf(26),
  },
  roleIndicator: {
    alignSelf: 'flex-start',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rw(10),
    paddingVertical: rh(5),
    borderRadius: rs(16),
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.xs,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: rw(4),
    textTransform: 'uppercase',
  },
  
  // Details Section
  detailsSection: {
    paddingHorizontal: rw(16),
    paddingBottom: rh(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rh(8),
  },
  iconContainer: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rw(12),
  },
  detailText: {
    color: theme.colors.text.secondary,
    fontSize: responsive.fontSize.base,
    fontWeight: theme.typography.weights.medium,
    flex: 1,
  },
  
  // Footer Section
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rw(16),
    paddingBottom: rh(16),
    paddingTop: rh(8),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  attendeeSection: {
    flex: 1,
  },
  attendeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rh(8),
  },
  attendeeText: {
    color: theme.colors.text.secondary,
    fontSize: responsive.fontSize.sm,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: rw(6),
  },
  
  // Avatars
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.sm,
    fontWeight: theme.typography.weights.bold,
  },
  extraAvatar: {
    marginLeft: rs(-12),
  },
  avatarExtra: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.xs,
    fontWeight: theme.typography.weights.bold,
  },
  
  // Diet Tag
  dietTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rw(12),
    paddingVertical: rh(8),
    borderRadius: rs(16),
    overflow: 'hidden',
  },
  dietIcon: {
    fontSize: rf(16),
    marginRight: rw(6),
  },
  dietLabel: {
    fontSize: responsive.fontSize.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  
  // Status Pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rw(12),
    paddingVertical: rh(6),
    borderRadius: rs(16),
  },
  statusEmoji: {
    fontSize: rf(14),
    marginRight: rw(6),
  },
  statusLabel: {
    fontSize: responsive.fontSize.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: rw(16),
    paddingBottom: rh(16),
    gap: rs(8),
  },
  actionButtonWrapper: {
    borderRadius: rs(25),
    overflow: 'hidden',
    ...shadows.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rw(14),
    paddingVertical: rh(8),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.sm,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: rw(6),
  },
  
  // Decorative Elements
  decorativeCorner: {
    position: 'absolute',
    top: rs(-10),
    right: rs(-10),
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: theme.colors.secondary.yellow,
    opacity: 0.1,
  },
  decorativeCorner2: {
    position: 'absolute',
    bottom: rs(-15),
    left: rs(-15),
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    backgroundColor: theme.colors.secondary.blue,
    opacity: 0.08,
  },
});

export default EventCardEnhanced;