import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/apiClient";

/**
 * Renders the user preferences screen for location and discovery settings.
 *
 * This component manages user preferences related to location, including latitude, longitude, city, and discovery radius.
 * It fetches the user's current location, allows searching for places, and saves the preferences to an API.
 * The component handles asynchronous operations for fetching data and saving preferences, with appropriate error handling and user feedback.
 *
 * @param {Object} props - The component props.
 * @param {function} [props.onBack] - Optional callback function to be called when navigating back.
 */
export default function UserPreferencesScreen({ onBack }: { onBack?: () => void }) {
  const [latitude, setLatitude] = useState<string>(""); // hidden/internal
  const [longitude, setLongitude] = useState<string>(""); // hidden/internal
  const [city, setCity] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<string>("25");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Load city if API returns it
        const loc = await apiClient.get<any>(`/user-location/me/location`);
        if (loc && typeof loc === 'object') {
          if (loc.city) setCity(String(loc.city));
        }
      } catch {}
      // If no GET discoverability endpoint, keep default radius; saving will set it
    })();
  }, []);

  const save = useCallback(async () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      Alert.alert('Invalid coordinates', 'Please enter valid latitude and longitude.');
      return;
    }
    const radius = Math.max(1, Math.min(200, parseInt(radiusKm || '25', 10)));
    setSaving(true);
    try {
      // Ensure a city value when saving (reverse geocode if missing)
      let cityToSend = city;
      if (!cityToSend) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const d = await r.json();
          if (d && d.display_name) cityToSend = String(d.display_name);
        } catch {}
      }

      await apiClient.patch(`/user-location/me/location`, {
        latitude: lat,
        longitude: lon,
        city: cityToSend || null,
        geo_precision: 'exact'
      });
      // Try to update discoverability; ignore if endpoint not present
      try {
        await apiClient.patch(`/user-location/me/discoverability`, {
          discoverability_enabled: true,
          discoverability_radius_km: radius,
          geo_precision: 'exact'
        });
      } catch {}
      Alert.alert('Preferences saved', 'Your location and discovery radius have been updated.');
      onBack?.();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [latitude, longitude, city, radiusKm, onBack]);

  const useCurrentLocation = useCallback(async () => {
    try {
      setSearching(true);
      if (Platform.OS === 'web') {
        if (!('geolocation' in navigator)) {
          Alert.alert('Not supported', 'Geolocation is not supported in this browser.');
          return;
        }
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = Number(pos.coords.latitude.toFixed(6));
              const lon = Number(pos.coords.longitude.toFixed(6));
              setLatitude(String(lat));
              setLongitude(String(lon));
              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(r => r.json())
                .then(d => { if (d && d.display_name) setCity(String(d.display_name)); })
                .finally(() => {
                  Alert.alert('Location set', 'Using your current browser location.');
                  resolve();
                });
            },
            (err) => reject(err),
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
          );
        });
      } else {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Location permission is needed to use current location.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setLatitude(String(lat));
        setLongitude(String(lon));
        // Reverse geocode city
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data && data.display_name) setCity(String(data.display_name));
        } catch {}
        Alert.alert('Location set', 'Using your current GPS location.');
      }
    } catch (e: any) {
      Alert.alert('Failed to get location', e?.message ?? 'Unknown error');
    } finally {
      setSearching(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (!term.trim()) { setSuggestions([]); return; }
    try {
      setSearching(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term.trim())}&addressdetails=0&limit=5`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSuggestions(data.map((d: any) => ({ display_name: d.display_name, lat: d.lat, lon: d.lon })));
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onChangeSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => fetchSuggestions(val), 300);
    setDebounceTimer(t);
  }, [debounceTimer, fetchSuggestions]);

  const applySuggestion = useCallback((s: { display_name: string; lat: string; lon: string }) => {
    setLatitude(String(parseFloat(s.lat).toFixed(6)));
    setLongitude(String(parseFloat(s.lon).toFixed(6)));
    setCity(s.display_name);
    setSuggestions([]);
  }, []);

  return (
    <LinearGradient colors={["#7b2ff7", "#ff2d91"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.title}>User Preferences</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={styles.card}>
              <Text style={styles.label}>Search place (powered by OpenStreetMap)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={search}
                  onChangeText={onChangeSearch}
                  placeholder="e.g., San Francisco City Hall"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable style={[styles.smallBtn, { marginLeft: 8 }]} onPress={() => fetchSuggestions(search)} disabled={searching}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallBtnText}>Search</Text>}
                </Pressable>
              </View>
              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((s, idx) => (
                    <Pressable key={`${s.lat}-${s.lon}-${idx}`} style={styles.suggestionItem} onPress={() => applySuggestion(s)}>
                      <Text numberOfLines={2} style={styles.suggestionText}>{s.display_name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable style={[styles.button, { backgroundColor: '#10b981', opacity: searching ? 0.6 : 1 }]} onPress={useCurrentLocation} disabled={searching}>
                <Text style={styles.buttonText}>{searching ? 'Locating…' : 'Use Current Location'}</Text>
              </Pressable>
              <Text style={styles.label}>City (optional)</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="San Francisco"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
              <Text style={styles.label}>Discovery Radius (km)</Text>
              <TextInput
                value={radiusKm}
                onChangeText={setRadiusKm}
                placeholder="25"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                style={styles.input}
              />
              <Pressable style={[styles.button, { opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}>
                <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
  },
  label: { color: '#374151', fontWeight: '700', marginTop: 10 },
  input: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: '#111827'
  },
  button: {
    marginTop: 16,
    backgroundColor: '#7b2ff7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10
  },
  buttonText: { color: '#fff', fontWeight: '800' }
});

// Extra styles for suggestions
Object.assign(styles, {
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden'
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  suggestionText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600'
  }
});


