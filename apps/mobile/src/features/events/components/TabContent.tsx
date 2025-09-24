import React from 'react';
import { View, Text, ActivityIndicator, Alert, Linking, Pressable } from 'react-native';
import { Icon } from '@/components/ui/Icon';

export type TabContentProps = {
  tabKey: string;
  loadingPending: boolean;
  pendingApprovals: any[] | null;
  mapMode: boolean;
  mapPoints: Array<{ id: string; lat: number; lon: number; title?: string }>;
  onOpenEvent: (id: string) => void;
  onApproveRequest?: (eventId: string, requestId: string) => Promise<void> | void;
  onWaitlistRequest?: (eventId: string, requestId: string) => Promise<void> | void;
  onDeclineRequest?: (eventId: string, requestId: string) => Promise<void> | void;
};

export function TabContent({ tabKey, loadingPending, pendingApprovals, mapMode, mapPoints, onOpenEvent, onApproveRequest, onWaitlistRequest, onDeclineRequest }: TabContentProps) {
  if (tabKey === 'pending-approval') {
    return (
      <View style={{ flex: 1, backgroundColor: '#351657', paddingHorizontal: 16, paddingTop: 12 }}>
        {loadingPending ? (
          <ActivityIndicator color="#fff" />
        ) : !pendingApprovals || pendingApprovals.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, backgroundColor: '#351657' }}>
            <Icon name="Inbox" size={48} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>No pending join requests</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>When guests request to join your events, they will appear here.</Text>
          </View>
        ) : (
          pendingApprovals.map((req: any) => (
            <View key={req.id} style={{ borderRadius: 18, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: '#fff' }}>
              <Text style={{ fontWeight: '800', color: '#111827' }}>Event: {req.event_id}</Text>
              <Text style={{ marginTop: 4, color: '#374151' }}>Party size: {req.party_size}</Text>
              {req.note ? <Text style={{ marginTop: 4, color: '#6B7280' }} numberOfLines={2}>&quot;{req.note}&quot;</Text> : null}
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                {!!onApproveRequest && (
                  <Pressable onPress={() => onApproveRequest(req.event_id, req.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#4CAF50' }} accessibilityRole="button" accessibilityLabel="Approve join request">
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Approve</Text>
                  </Pressable>
                )}
                {!!onWaitlistRequest && (
                  <Pressable onPress={() => onWaitlistRequest(req.event_id, req.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FF9800' }} accessibilityRole="button" accessibilityLabel="Move request to waitlist">
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Waitlist</Text>
                  </Pressable>
                )}
                {!!onDeclineRequest && (
                  <Pressable onPress={() => onDeclineRequest(req.event_id, req.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F44336' }} accessibilityRole="button" accessibilityLabel="Decline join request">
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Decline</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  if (!mapMode) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#351657', paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ width: '100%', height: 240, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
        <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Icon name="Map" size={48} color="#9CA3AF" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginTop: 12, marginBottom: 8 }}>Map View</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>{mapPoints.length} event{mapPoints.length !== 1 ? 's' : ''} in your area</Text>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#A22AD0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }} onPress={() => {
            if (mapPoints.length > 0) {
              const firstPoint = mapPoints[0];
              const url = `https://www.google.com/maps?q=${firstPoint.lat},${firstPoint.lon}`;
              Linking.openURL(url).catch(() => { Alert.alert('Error', 'Could not open maps'); });
            }
          }}>
            <Icon name="ExternalLink" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 }}>Open in Maps</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        {mapPoints.map(p => (
          <View key={p.id} style={{ borderRadius: 18, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: '#fff' }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>{p.title || 'Event'}</Text>
            <Text style={{ color: '#374151', marginTop: 2 }}>{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={() => onOpenEvent(p.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#7b2ff7' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Open</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

