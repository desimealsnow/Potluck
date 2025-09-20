import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Icon } from './Icon';
import { FilterChip } from './FilterChip';

export interface FilterPanelProps {
  ownership: string;
  onOwnershipChange: (value: string) => void;
  dietFilters: string[];
  onDietChange: (diet: string) => void;
  useNearby: boolean;
  onNearbyChange: (value: boolean) => void;
  userLocation: any;
  onRadiusChange: (radius: number) => void;
}

export function FilterPanel({
  ownership,
  onOwnershipChange,
  dietFilters,
  onDietChange,
  useNearby,
  onNearbyChange,
  userLocation,
  onRadiusChange,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const togglePanel = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

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

  return (
    <View style={styles.container}>
      {/* Filter Toggle Button */}
      <Pressable onPress={togglePanel} style={styles.toggleButton} testID="filter-toggle">
        <Icon name="ListFilter" size={16} color="#fff" />
        <Text style={styles.toggleText}>Filters</Text>
        {activeFiltersCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
          </View>
        )}
        <Icon 
          name={isExpanded ? "ChevronUp" : "ChevronDown"} 
          size={16} 
          color="#fff" 
          style={styles.chevron}
        />
      </Pressable>

      {/* Collapsible Filter Content */}
      <Animated.View 
        style={[
          styles.panel,
          {
            height: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200], // Adjust height as needed
            }),
            opacity: animation,
          }
        ]}
      >
        <View style={styles.panelContent}>
          {/* Ownership Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Show</Text>
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
          </View>

          {/* Nearby Filter */}
          {userLocation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
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
                      <Icon name="Minus" size={16} color="#7b2ff7" />
                    </Pressable>
                    <Text style={styles.radiusValue}>{userLocation.radius_km}km</Text>
                    <Pressable 
                      onPress={() => onRadiusChange(Math.min(100, userLocation.radius_km + 5))}
                      style={styles.radiusButton}
                    >
                      <Icon name="Plus" size={16} color="#7b2ff7" />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Diet Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diet</Text>
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
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  badge: {
    backgroundColor: '#7B2FF7',
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
  chevron: {
    marginLeft: 'auto',
  },
  panel: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  panelContent: {
    padding: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    marginRight: 0,
    marginBottom: 6,
  },
  radiusContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  radiusLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  radiusSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  radiusValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
});
