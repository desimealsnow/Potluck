import React from 'react';
import { View, Text } from 'react-native';
import { FilterChip } from '@/components/ui/FilterChip';
import { Segmented } from '@/components/ui/Segmented';
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
          <Segmented
            value={statusTab}
            onChange={(v: string) => onStatusChange(v as EventStatusMobile)}
            options={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'drafts', label: 'Drafts' }]}
            testID="status-segmented"
          />
        </View>
      )}
      <View style={{ marginBottom: 16, backgroundColor: '#373244', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Ownership</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['all', 'mine', 'invited'] as Ownership[]).map(key => (
            <FilterChip key={key} selected={ownership === key} onPress={() => { setOwnership(key); reload(); }} testID={`ownership-${key}`}>
              <Text style={{ color: '#fff' }}>{key === 'all' ? 'All Events' : key === 'mine' ? 'My Events' : 'Invited Events'}</Text>
            </FilterChip>
          ))}
        </View>
      </View>
      <View style={{ marginBottom: 16, backgroundColor: '#373244', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Dietary Preferences</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['veg', 'nonveg', 'mixed'] as Diet[]).map(diet => (
            <FilterChip key={diet} selected={dietFilters.includes(diet)} onPress={() => { toggleDiet(diet); reload(); }} testID={`diet-${diet}`}>
              <Text style={{ color: '#fff' }}>{diet === 'veg' ? 'Veg' : diet === 'nonveg' ? 'Non-veg' : 'Mixed'}</Text>
            </FilterChip>
          ))}
        </View>
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


