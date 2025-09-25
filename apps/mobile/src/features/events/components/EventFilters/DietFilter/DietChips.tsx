import React from 'react';
import { View, Text } from 'react-native';
import { FilterChip } from '@/components/ui/FilterChip';
import type { Diet } from '@common/types';

type Props = {
  dietFilters: Diet[];
  toggleDiet: (d: Diet) => void;
  reload: () => void;
};

export function DietChips({ dietFilters, toggleDiet, reload }: Props) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['veg', 'nonveg', 'mixed'] as Diet[]).map(diet => (
        <FilterChip key={diet} selected={dietFilters.includes(diet)} onPress={() => { toggleDiet(diet); reload(); }} testID={`diet-${diet}`}>
          <Text style={{ color: '#fff' }}>{diet === 'veg' ? 'Veg' : diet === 'nonveg' ? 'Non-veg' : 'Mixed'}</Text>
        </FilterChip>
      ))}
    </View>
  );
}
