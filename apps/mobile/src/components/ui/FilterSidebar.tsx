import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { FilterChip } from './FilterChip';
import { gradients } from '@/theme';

export interface FilterSidebarProps {
  ownership: string;
  onOwnershipChange: (value: string) => void;
  dietFilters: string[];
  onDietChange: (diet: string) => void;
  useNearby: boolean;
  onNearbyChange: (value: boolean) => void;
  userLocation: any;
  onRadiusChange: (radius: number) => void;
}

export function FilterSidebar({
  ownership,
  onOwnershipChange,
  dietFilters,
  onDietChange,
  useNearby,
  onNearbyChange,
  userLocation,
  onRadiusChange,
}: FilterSidebarProps) {
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
    <LinearGradient
      colors={gradients.header.event}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Icon name="ListFilter" size={20} color="#7B2FF7" />
        <Text style={styles.title}>Filters</Text>
        {activeFiltersCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
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
