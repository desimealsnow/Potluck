import React from 'react';
import { Segmented } from '@/components/ui/Segmented';
import type { EventStatusMobile } from '@common/types';

type Props = {
  value: EventStatusMobile;
  onChange: (s: EventStatusMobile) => void;
  testID?: string;
};

export function SegmentedStatus({ value, onChange, testID }: Props) {
  return (
    <Segmented
      value={value}
      onChange={(v: string) => onChange(v as EventStatusMobile)}
      options={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'drafts', label: 'Drafts' }]}
      testID={testID || 'status-segmented'}
    />
  );
}
