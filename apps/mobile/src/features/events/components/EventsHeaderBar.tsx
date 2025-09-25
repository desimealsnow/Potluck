import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/components/ui/Icon';

export type EventsHeaderBarProps = {
  total: number;
  loading: boolean;
  isMobile: boolean;
  mapMode: boolean;
  onToggleMap: () => void;
  sidebarVisible: boolean;
  onToggleFilters: () => void;
  onCreateEvent: () => void;
  canCreate: boolean;
  getActiveFiltersCount: () => number;
};

export function EventsHeaderBar({ total, loading, isMobile, mapMode, onToggleMap, sidebarVisible, onToggleFilters, onCreateEvent, canCreate, getActiveFiltersCount }: EventsHeaderBarProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Events</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>{loading ? 'Loading...' : `${total} event${total !== 1 ? 's' : ''} found`}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={onToggleMap} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 }} testID="map-toggle-button" accessibilityRole="button" accessibilityLabel={mapMode ? 'Switch to list view' : 'Switch to map view'}>
          <Icon name={mapMode ? 'List' : 'Map'} size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>{mapMode ? 'List' : 'Map'}</Text>
        </Pressable>
        <Pressable onPress={onToggleFilters} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 }} testID="filter-toggle-button" accessibilityRole="button" accessibilityLabel={isMobile ? 'Open filters' : (sidebarVisible ? 'Hide filters' : 'Show filters')}>
          <Icon name="SlidersHorizontal" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>{isMobile ? 'Filters' : (sidebarVisible ? 'Hide' : 'Show')}</Text>
          {getActiveFiltersCount() > 0 && (
            <View style={{ backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={onCreateEvent} disabled={!canCreate} style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }, !canCreate && { opacity: 0.6 }]} testID="create-event-button" accessibilityRole="button" accessibilityLabel="Create event">
          <Icon name="Plus" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>Create Event</Text>
        </Pressable>
      </View>
    </View>
  );
}


