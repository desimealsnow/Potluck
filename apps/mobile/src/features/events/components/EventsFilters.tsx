import React from 'react';
import { View, Text } from 'react-native';
import { FilterChip } from '@/components/ui/FilterChip';
import { Segmented } from '@/components/ui/Segmented';
import { SegmentedStatus } from './EventFilters/StatusFilter/SegmentedStatus';
import { OwnershipChips } from './EventFilters/OwnershipFilter/OwnershipChips';
import { DietChips } from './EventFilters/DietFilter/DietChips';
import type { Diet, Ownership, EventStatusMobile } from '@common/types';

export type EventsFiltersProps = {
  ownership: Ownership;
  setOwnership: (o: Ownership) => void;
  dietFilters: Diet[];
  toggleDiet: (d: Diet) => void;
  statusTab: EventStatusMobile;
  onStatusChange: (s: EventStatusMobile) => void;
  useNearby: boolean;
  setUseNearby: (v: boolean) => void;
  isTablet: boolean;
  reload: () => void;
};

export function EventsFilters({ ownership, setOwnership, dietFilters, toggleDiet, statusTab, onStatusChange, useNearby, setUseNearby, isTablet, reload }: EventsFiltersProps) {
  return (
    <View style={{ padding: 8 }}>
      {isTablet && (
        <View style={{ marginBottom: 16, backgroundColor: '#373244', borderRadius: 12, padding: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Status</Text>
          <SegmentedStatus value={statusTab} onChange={onStatusChange} testID="status-segmented" />
        </View>
      )}
      <View style={{ marginBottom: 16, backgroundColor: '#373244', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Ownership</Text>
        <OwnershipChips ownership={ownership} setOwnership={setOwnership} reload={reload} />
      </View>
      <View style={{ marginBottom: 16, backgroundColor: '#373244', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Dietary Preferences</Text>
        <DietChips dietFilters={dietFilters} toggleDiet={toggleDiet} reload={reload} />
      </View>
      <View style={{ marginBottom: 16, backgroundColor: '#373244', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Location</Text>
        <FilterChip selected={useNearby} onPress={() => { setUseNearby(!useNearby); reload(); }} testID="location-nearby">
          <Text style={{ color: '#fff' }}>{useNearby ? 'Nearby Events' : 'All Locations'}</Text>
        </FilterChip>
      </View>
    </View>
  );
}


