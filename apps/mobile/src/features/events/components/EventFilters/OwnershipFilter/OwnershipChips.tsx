import React from 'react';
import { View, Text } from 'react-native';
import { FilterChip } from '@/components/ui/FilterChip';
import type { Ownership } from '@common/types';

type Props = {
  ownership: Ownership;
  setOwnership: (o: Ownership) => void;
  reload: () => void;
};

export function OwnershipChips({ ownership, setOwnership, reload }: Props) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['all', 'mine', 'invited'] as Ownership[]).map(key => (
        <FilterChip key={key} selected={ownership === key} onPress={() => { setOwnership(key); reload(); }} testID={`ownership-${key}`}>
          <Text style={{ color: '#fff' }}>{key === 'all' ? 'All Events' : key === 'mine' ? 'My Events' : 'Invited Events'}</Text>
        </FilterChip>
      ))}
    </View>
  );
}
