import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Icon } from './Icon';

export interface AppliedFiltersBarProps {
  ownership: string;
  dietFilters: string[];
  useNearby: boolean;
  userLocation: any;
  onRemoveFilter: (filterType: string, value?: string) => void;
}

export function AppliedFiltersBar({
  ownership,
  dietFilters,
  useNearby,
  userLocation,
  onRemoveFilter,
}: AppliedFiltersBarProps) {
  const getActiveFilters = () => {
    const filters = [];
    
    if (ownership !== 'all') {
      filters.push({
        key: 'ownership',
        label: `Show: ${ownership.charAt(0).toUpperCase() + ownership.slice(1)}`,
        onRemove: () => onRemoveFilter('ownership'),
      });
    }
    
    if (useNearby && userLocation) {
      filters.push({
        key: 'nearby',
        label: `Nearby (${userLocation.radius_km}km)`,
        onRemove: () => onRemoveFilter('nearby'),
      });
    }
    
    dietFilters.forEach((diet) => {
      const pretty = diet === 'veg' ? 'Veg' : diet === 'nonveg' ? 'Non-veg' : 'Mixed';
      filters.push({
        key: `diet-${diet}`,
        label: `Diet: ${pretty}`,
        onRemove: () => onRemoveFilter('diet', diet),
      });
    });
    
    return filters;
  };

  const activeFilters = getActiveFilters();

  if (activeFilters.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeFilters.map((filter) => (
          <View key={filter.key} style={styles.filterChip}>
            <Text style={styles.filterText}>{filter.label}</Text>
            <Pressable onPress={filter.onRemove} style={styles.removeButton}>
              <Icon name="X" size={14} color="#7B2FF7" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  filterText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  removeButton: {
    padding: 2,
  },
});
