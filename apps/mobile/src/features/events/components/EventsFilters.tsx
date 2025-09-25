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

/**
 * Renders a set of filters for event selection based on ownership, dietary preferences, and location.
 *
 * The function displays segmented controls for event status, filter chips for ownership and dietary preferences,
 * and a toggle for nearby events. It updates the state and reloads the data when filters are changed.
 *
 * @param ownership - The current ownership filter value.
 * @param setOwnership - Function to update the ownership filter.
 * @param dietFilters - An array of selected dietary preferences.
 * @param toggleDiet - Function to toggle a dietary preference.
 * @param statusTab - The current selected status tab.
 * @param onStatusChange - Function to handle changes in the status tab.
 * @param useNearby - Boolean indicating if nearby events should be shown.
 * @param setUseNearby - Function to toggle the nearby events filter.
 * @param isTablet - Boolean indicating if the device is a tablet.
 * @param reload - Function to reload the event data.
 */
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


