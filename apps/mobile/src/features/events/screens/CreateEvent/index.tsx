import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { Icon } from '@/components';
import { Input } from '@/components/ui/Input';
import { Card, Label } from '@/components';
import { apiClient } from '@/services/apiClient';

type CreateEventProps = { onEventCreated?: (eventId: string) => void; onBack?: () => void };

export default function CreateEventScreen({ onEventCreated, onBack }: CreateEventProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minGuests, setMinGuests] = useState('1');
  const [maxGuests, setMaxGuests] = useState('10');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    if (!title.trim()) { Alert.alert('Missing title', 'Please enter a title.'); return; }
    if (!location.trim()) { Alert.alert('Missing location', 'Please enter a location.'); return; }
    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        // temporary simple payload; server will enrich
        event_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        min_guests: parseInt(minGuests || '1', 10) || 1,
        max_guests: parseInt(maxGuests || '0', 10) || undefined,
        location: { name: location.trim(), formatted_address: location.trim() },
        items: [],
        is_public: true,
      };
      const res = await apiClient.post<any>('/events', payload);
      const eventId = res?.event?.id || res?.id;
      if (eventId) {
        Alert.alert('Created', 'Your event was created.', [{ text: 'OK', onPress: () => onEventCreated?.(eventId) }]);
      } else {
        Alert.alert('Created', 'Your event was created.');
        onEventCreated?.(eventId);
      }
    } catch (e: any) {
      Alert.alert('Create failed', e?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={18} color="#fff" /></Pressable>
          <Text style={styles.topTitle}>Create Potluck</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <Card>
            <Label>Title</Label>
            <Input placeholder="Event title" value={title} onChangeText={setTitle} variant="surface" />
            <Label>Description</Label>
            <Input placeholder="Optional description" value={description} onChangeText={setDescription} multiline numberOfLines={3} variant="surface" style={{ height: 96, textAlignVertical: 'top' }} />
            <Label>Location</Label>
            <Input placeholder="City / venue" value={location} onChangeText={setLocation} variant="surface" />
            <View style={styles.row}> 
              <View style={{ flex: 1, marginRight: 8 }}>
                <Label>Min Guests</Label>
                <Input keyboardType="number-pad" value={minGuests} onChangeText={(v: string) => setMinGuests(v.replace(/[^0-9]/g, ''))} variant="surface" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Label>Max Guests</Label>
                <Input keyboardType="number-pad" value={maxGuests} onChangeText={(v: string) => setMaxGuests(v.replace(/[^0-9]/g, ''))} variant="surface" />
              </View>
            </View>
            <Pressable onPress={submit} disabled={submitting} style={[styles.cta, submitting && { opacity: 0.6 }]}>
              <Text style={styles.ctaText}>{submitting ? 'Creating…' : 'Create Event'}</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#351657' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  topTitle: { color: '#fff', fontWeight: '900' },
  row: { flexDirection: 'row', marginTop: 8 },
  cta: { marginTop: 16, height: 48, borderRadius: 12, backgroundColor: '#A22AD0', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '900' },
});
