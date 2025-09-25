import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Icon } from '@/components/ui/Icon';

type MapPoint = { id: string; lat: number; lon: number; title?: string };

type Props = {
  mapPoints: MapPoint[];
  styles: any;
  onOpenMaps: (lat: number, lon: number) => void;
  onOpenEvent: (id: string) => void;
};

export default function EventsMapView({ mapPoints, styles, onOpenMaps, onOpenEvent }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Icon name="Map" size={48} color="#9CA3AF" />
          <Text style={styles.mapPlaceholderTitle}>Map View</Text>
          <Text style={styles.mapPlaceholderText}>
            {mapPoints.length} event{mapPoints.length !== 1 ? 's' : ''} in your area
          </Text>
          <Pressable 
            style={styles.mapButton}
            onPress={() => {
              if (mapPoints.length > 0) {
                const firstPoint = mapPoints[0];
                onOpenMaps(firstPoint.lat, firstPoint.lon);
              }
            }}
          >
            <Icon name="ExternalLink" size={16} color="#fff" />
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        {mapPoints.map(p => (
          <View key={p.id} style={[styles.card, { backgroundColor: '#fff' }]}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>{p.title || 'Event'}</Text>
            <Text style={{ color: '#374151', marginTop: 2 }}>{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={() => onOpenEvent(p.id)} style={[styles.actionButton, { backgroundColor: '#7b2ff7' }] }>
                <Text style={styles.actionButtonText}>Open</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
