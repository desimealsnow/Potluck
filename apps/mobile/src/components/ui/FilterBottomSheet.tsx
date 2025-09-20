import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { FilterChip } from './FilterChip';
import { gradients } from '@/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  ownership: string;
  onOwnershipChange: (value: string) => void;
  dietFilters: string[];
  onDietChange: (diet: string) => void;
  useNearby: boolean;
  onNearbyChange: (value: boolean) => void;
  userLocation: any;
  onRadiusChange: (radius: number) => void;
}

export function FilterBottomSheet({
  visible,
  onClose,
  ownership,
  onOwnershipChange,
  dietFilters,
  onDietChange,
  useNearby,
  onNearbyChange,
  userLocation,
  onRadiusChange,
}: FilterBottomSheetProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [expandedSections, setExpandedSections] = useState({
    show: true,
    location: true,
    diet: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 0 && gestureState.dy > 50;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const ownershipOptions = [
    { key: 'all', label: 'All', icon: 'ListFilter' },
    { key: 'mine', label: 'Mine', icon: 'User' },
    { key: 'invited', label: 'Invited', icon: 'Users' },
  ];

  const dietOptions = [
    { key: 'veg', label: 'Veg', icon: 'Leaf' },
    { key: 'nonveg', label: 'Non-veg', icon: 'Utensils' },
    { key: 'mixed', label: 'Mixed', icon: 'ListFilter' },
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (ownership !== 'all') count++;
    if (dietFilters.length > 0) count++;
    if (useNearby) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <Animated.View
          style={[
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={gradients.header.event}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
          >
          {/* Handle */}
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="ListFilter" size={20} color="#7B2FF7" />
              <Text style={styles.title}>Filters</Text>
              {activeFiltersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="X" size={24} color="#6B7280" />
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Ownership Filters */}
            <View style={styles.section}>
              <Pressable 
                style={styles.sectionHeader}
                onPress={() => toggleSection('show')}
              >
                <Text style={styles.sectionTitle}>Show</Text>
                <Icon 
                  name={expandedSections.show ? "ChevronUp" : "ChevronDown"} 
                  size={20} 
                  color="#fff" 
                />
              </Pressable>
              {expandedSections.show && (
                <View style={styles.chipRow}>
                  {ownershipOptions.map((option) => (
                    <FilterChip
                      key={option.key}
                      selected={ownership === option.key}
                      onPress={() => onOwnershipChange(option.key)}
                      icon={option.icon as any}
                      style={styles.chip}
                    >
                      {option.label}
                    </FilterChip>
                  ))}
                </View>
              )}
            </View>

            {/* Location Filter */}
            {userLocation && (
              <View style={styles.section}>
                <Pressable 
                  style={styles.sectionHeader}
                  onPress={() => toggleSection('location')}
                >
                  <Text style={styles.sectionTitle}>Location</Text>
                  <Icon 
                    name={expandedSections.location ? "ChevronUp" : "ChevronDown"} 
                    size={20} 
                    color="#fff" 
                  />
                </Pressable>
                {expandedSections.location && (
                  <>
                    <View style={styles.chipRow}>
                      <FilterChip
                        selected={useNearby}
                        onPress={() => onNearbyChange(!useNearby)}
                        icon="MapPin"
                        style={styles.chip}
                      >
                        Nearby ({userLocation.radius_km}km)
                      </FilterChip>
                    </View>
                    {useNearby && (
                      <View style={styles.radiusContainer}>
                        <Text style={styles.radiusLabel}>Radius: {userLocation.radius_km}km</Text>
                        <View style={styles.radiusSlider}>
                          <Pressable 
                            onPress={() => onRadiusChange(Math.max(1, userLocation.radius_km - 5))}
                            style={styles.radiusButton}
                          >
                            <Icon name="Minus" size={16} color="#fff" />
                          </Pressable>
                          <Text style={styles.radiusValue}>{userLocation.radius_km}km</Text>
                          <Pressable 
                            onPress={() => onRadiusChange(Math.min(100, userLocation.radius_km + 5))}
                            style={styles.radiusButton}
                          >
                            <Icon name="Plus" size={16} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Diet Filters */}
            <View style={styles.section}>
              <Pressable 
                style={styles.sectionHeader}
                onPress={() => toggleSection('diet')}
              >
                <Text style={styles.sectionTitle}>Diet</Text>
                <Icon 
                  name={expandedSections.diet ? "ChevronUp" : "ChevronDown"} 
                  size={20} 
                  color="#fff" 
                />
              </Pressable>
              {expandedSections.diet && (
                <View style={styles.chipRow}>
                  {dietOptions.map((option) => (
                    <FilterChip
                      key={option.key}
                      selected={dietFilters.includes(option.key)}
                      onPress={() => onDietChange(option.key)}
                      icon={option.icon as any}
                      style={styles.chip}
                    >
                      {option.label}
                    </FilterChip>
                  ))}
                </View>
              )}
            </View>
          </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 0,
    marginBottom: 8,
  },
  radiusContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  radiusLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  radiusSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  radiusValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
  },
});
