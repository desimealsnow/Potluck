import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';
import { formatDateTimeRange } from '@/utils/dateUtils';
import { vibrantTheme } from '@/theme/vibrant-theme';
import type { EventItem, Attendee, Diet } from '@common/types';

const theme = vibrantTheme;

function DietTag({ diet }: { diet: Diet }) {
  const dietConfig = {
    veg: {
      gradient: ['#95E1A4', '#6BCF7F'],
      icon: '🥗',
      label: 'Vegetarian',
      textColor: '#2D5F3F',
    },
    nonveg: {
      gradient: ['#FFB088', '#FF8E53'],
      icon: '🍖',
      label: 'Non-Veg',
      textColor: '#8B4513',
    },
    mixed: {
      gradient: ['#B4A7D6', '#9F7AEA'],
      icon: '🍽️',
      label: 'Mixed',
      textColor: '#4A3C6B',
    },
  } as const;
  
  const config = dietConfig[diet];
  
  return (
    <LinearGradient
      colors={config.gradient}
      style={styles.dietTag}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.dietIcon}>{config.icon}</Text>
      <Text style={[styles.dietLabel, { color: config.textColor }]}>{config.label}</Text>
    </LinearGradient>
  );
}

function StatusPill({ status, testID }: { status: 'active' | 'cancelled' | 'draft' | 'deleted' | 'past'; testID?: string }) {
  const statusConfig = {
    active: {
      gradient: ['#95E1A4', '#6BCF7F'],
      icon: 'CircleCheck' as const,
      label: 'Active',
      emoji: '✨',
    },
    cancelled: {
      gradient: ['#FFB4B4', '#FC5C65'],
      icon: 'CircleX' as const,
      label: 'Cancelled',
      emoji: '❌',
    },
    draft: {
      gradient: ['#FFD93D', '#FFB088'],
      icon: 'Pencil' as const,
      label: 'Draft',
      emoji: '📝',
    },
    deleted: {
      gradient: ['#CBD5E0', '#A0AEC0'],
      icon: 'Trash2' as const,
      label: 'Deleted',
      emoji: '🗑️',
    },
    past: {
      gradient: ['#B4A7D6', '#9F7AEA'],
      icon: 'Clock' as const,
      label: 'Past',
      emoji: '⏰',
    },
  };
  
  const config = statusConfig[status] || statusConfig.active;
  
  return (
    <LinearGradient
      colors={config.gradient}
      style={styles.statusPill}
      testID={testID}
    >
      <Text style={styles.statusEmoji}>{config.emoji}</Text>
      <Text style={styles.statusLabel} testID={`${testID}-text`}>{config.label}</Text>
    </LinearGradient>
  );
}

function Avatars({ people, extra }: { people: Attendee[]; extra?: number }) {
  const avatarColors = [
    theme.colors.primary.main,
    theme.colors.secondary.blue,
    theme.colors.secondary.purple,
    theme.colors.secondary.green,
  ];
  
  return (
    <View style={styles.avatarsContainer}>
      {people.slice(0, 3).map((p, idx) => (
        <View 
          key={p.id} 
          style={[
            styles.avatarWrapper,
            { 
              marginLeft: idx === 0 ? 0 : -12,
              zIndex: 3 - idx,
              backgroundColor: avatarColors[idx % avatarColors.length],
            }
          ]}
        >
          <Text style={styles.avatarInitial}>
            {p.name ? p.name[0].toUpperCase() : 'G'}
          </Text>
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
    </View>
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
};

function EventCardVibrant({ item, onPress, actions = [], testID }: EventCardProps) {
  const dateLabel = formatDateTimeRange(new Date(item.date), item.time ? new Date(item.time) : undefined);
  const roleLabel = item.ownership === 'mine' ? 'host' : 'guest';
  const isHost = item.ownership === 'mine';
  
  // Animated scale for press feedback
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={onPress} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID} 
        accessibilityRole="button" 
        accessibilityLabel={`Open event ${item.title}`}
      >
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#FFF9F5']}
            style={styles.card}
          >
            {/* Decorative Header Gradient */}
            <LinearGradient
              colors={isHost ? theme.gradients.header.primary : theme.gradients.header.secondary}
              style={styles.headerAccent}
            />
            
            {/* Card Header */}
            <View style={styles.cardHeader} testID={`${testID}-header`}>
              <View style={styles.titleContainer}>
                <Text style={styles.cardTitle} testID={`${testID}-title`} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.roleIndicator}>
                  <LinearGradient
                    colors={isHost ? ['#FFD93D', '#FFB088'] : ['#4ECDC4', '#95E1A4']}
                    style={styles.roleBadge}
                  >
                    <Icon 
                      name={isHost ? 'Crown' : 'Users'} 
                      size={12} 
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
            
            {/* Event Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <View style={styles.iconContainer}>
                  <Icon name="Calendar" size={16} color={theme.colors.secondary.blue} />
                </View>
                <Text style={styles.detailText}>{dateLabel}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <View style={styles.iconContainer}>
                  <Icon name="MapPin" size={16} color={theme.colors.primary.main} />
                </View>
                <Text style={styles.detailText} numberOfLines={1}>{item.venue}</Text>
              </View>
            </View>
            
            {/* Footer Section */}
            <View style={styles.footerSection}>
              <View style={styles.attendeeSection}>
                <View style={styles.attendeeCount}>
                  <Icon name="Users" size={16} color={theme.colors.secondary.purple} />
                  <Text style={styles.attendeeText}>{item.attendeeCount} going</Text>
                </View>
                <Avatars
                  people={item.attendeesPreview || []}
                  extra={Math.max(0, (item.attendeeCount || 0) - (item.attendeesPreview?.length || 0))}
                />
              </View>
              
              <DietTag diet={item.diet} />
            </View>
            
            {/* Action Buttons */}
            {actions.length > 0 && (
              <View style={styles.actionsContainer} testID={`${testID}-actions`}>
                {actions.map(action => {
                  const actionGradients = {
                    'publish': theme.gradients.button.success,
                    'delete': ['#FFB4B4', '#FC5C65'],
                    'cancel': ['#FFB088', '#FF8E53'],
                    'complete': theme.gradients.button.secondary,
                    'restore': theme.gradients.button.primary,
                  };
                  
                  const gradient = actionGradients[action.key] || theme.gradients.button.primary;
                  
                  return (
                    <Pressable
                      key={action.key}
                      onPress={(e) => { 
                        e.stopPropagation(); 
                        action.handler(); 
                      }}
                      style={styles.actionButtonWrapper}
                      testID={`${testID}-action-${action.key}`}
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
                          size={14} 
                          color="#FFFFFF" 
                        />
                        <Text style={styles.actionButtonText} testID={`${testID}-action-${action.key}-text`}>
                          {action.label}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            )}
            
            {/* Fun decorative elements */}
            <View style={styles.decorativeCorner} />
            <View style={styles.decorativeCorner2} />
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const EventCardVibrant = React.memo(EventCardVibrant);

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 10,
    marginHorizontal: 2,
  },
  card: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  headerAccent: {
    height: 4,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 8,
    lineHeight: 26,
  },
  roleIndicator: {
    alignSelf: 'flex-start',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.chip,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  
  // Details Section
  detailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    flex: 1,
  },
  
  // Footer Section
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  attendeeSection: {
    flex: 1,
  },
  attendeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendeeText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: 6,
  },
  
  // Avatars
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  extraAvatar: {
    marginLeft: -12,
  },
  avatarExtra: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  
  // Diet Tag
  dietTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.chip,
  },
  dietIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  dietLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  
  // Status Pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.chip,
  },
  statusEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButtonWrapper: {
    borderRadius: theme.borderRadius.button,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: 6,
  },
  
  // Decorative Elements
  decorativeCorner: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary.yellow,
    opacity: 0.1,
  },
  decorativeCorner2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary.blue,
    opacity: 0.08,
  },
});

export default EventCardVibrant;