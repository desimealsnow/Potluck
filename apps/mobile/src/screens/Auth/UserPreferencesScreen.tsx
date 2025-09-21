import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components";
import Header from "@/components/Header";
import { apiClient } from "@/services/apiClient";
import { supabase } from "../../config/supabaseClient";

const { width: screenWidth } = Dimensions.get('window');

export default function UserPreferencesScreen({ onBack }: { onBack?: () => void }) {
  const [latitude, setLatitude] = useState<string>(""); // hidden/internal
  const [longitude, setLongitude] = useState<string>(""); // hidden/internal
  const [city, setCity] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<string>("25");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [mealPreferences, setMealPreferences] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [sent, setSent] = useState(false);

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

  // Load user data and meal preferences
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // Load user profile from our REST API
          try {
            console.log("Loading user profile from REST API...");
            const response = await apiClient.get('/user-profile/me') as any;
            console.log("Profile response:", response);
            
            if (response.meal_preferences) {
              console.log("Setting meal preferences from API:", response.meal_preferences);
              setMealPreferences(response.meal_preferences);
            } else if (session.user.user_metadata?.meal_preferences) {
              // Fallback to user metadata
              console.log("Setting meal preferences from user metadata:", session.user.user_metadata.meal_preferences);
              setMealPreferences(session.user.user_metadata.meal_preferences);
            } else {
              console.log("No meal preferences found in API or metadata");
            }

            // Load location data
            if (response.city) {
              console.log("Setting city from API:", response.city);
              setCity(response.city);
            }
            
            if (response.discoverability_radius_km) {
              console.log("Setting radius from API:", response.discoverability_radius_km);
              setRadiusKm(response.discoverability_radius_km.toString());
            }

            // Load coordinates if available
            if (response.latitude && response.longitude) {
              console.log("Setting coordinates from API:", { lat: response.latitude, lon: response.longitude });
              setLatitude(response.latitude.toString());
              setLongitude(response.longitude.toString());
            }
            if (response.phone_e164) setPhone(response.phone_e164);
          } catch (apiError) {
            console.error("API error:", apiError);
            // Fallback to user metadata if API call fails
            if (session.user.user_metadata?.meal_preferences) {
              console.log("Fallback to user metadata:", session.user.user_metadata.meal_preferences);
              setMealPreferences(session.user.user_metadata.meal_preferences);
            }
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const toggleMealPreference = (preference: string) => {
    setMealPreferences(prev => 
      prev.includes(preference) 
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  const save = useCallback(async () => {
    console.log("Save button clicked!");
    console.log("Current meal preferences:", mealPreferences);
    console.log("Current location:", { latitude, longitude, city });
    
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lon = longitude ? parseFloat(longitude) : undefined;
    console.log("Parsed coordinates:", { lat, lon, hasLat: !!lat, hasLon: !!lon });
    
    // Only require coordinates if we don't have a city
    if (!city && (Number.isNaN(lat) || Number.isNaN(lon))) {
      console.log("No city and invalid coordinates detected, showing alert");
      Alert.alert('Location required', 'Please either enter a city or use "Use Current Location" to get coordinates.');
      return;
    }
    const radius = Math.max(1, Math.min(200, parseInt(radiusKm || '25', 10)));
    console.log("Starting save process...");
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

      // Save everything using our REST API
      console.log("Saving preferences via REST API...");
      const payload: any = {
        display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User',
        meal_preferences: mealPreferences,
        city: cityToSend || null,
        discoverability_radius_km: radius
      };
      
      // Only include coordinates if we have them
      if (lat && lon) {
        payload.latitude = lat;
        payload.longitude = lon;
      }
      
      console.log("API payload:", payload);
      
      try {
        console.log("About to call apiClient.post...");
        const response = await apiClient.post('/user-profile/setup', payload);
        console.log("API response:", response);
        console.log("Preferences saved successfully");
      } catch (apiError) {
        console.error("API call failed:", apiError);
        throw apiError; // Re-throw to be caught by outer try-catch
      }
      Alert.alert('Preferences saved', 'Your location, discovery radius, and meal preferences have been updated.');
      onBack?.();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [latitude, longitude, city, radiusKm, mealPreferences, user, onBack]);

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
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header Component */}
        <Header
          onNotifications={() => {}}
          onSettings={() => {}}
          onPlans={() => {}}
          onLogout={() => {}}
          unreadCount={0}
          showNavigation={false}
        />
        
        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Icon name="ChevronLeft" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>User Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: screenWidth < 400 ? 12 : 16 }]}>
            {/* Loading Overlay */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading preferences...</Text>
              </View>
            )}
            
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
              
              {/* Meal Preferences Section */}
              <Text style={styles.label}>Dietary Preferences</Text>
              <Text style={styles.subLabel}>Select your dietary preferences to help us suggest better events</Text>
              <View style={styles.preferencesContainer}>
                {[
                  "Vegetarian",
                  "Vegan", 
                  "Gluten-Free",
                  "Dairy-Free",
                  "Nut-Free",
                  "Halal",
                  "Kosher",
                  "No Spicy Food"
                ].map((preference) => (
                  <Pressable
                    key={preference}
                    style={[
                      styles.preferenceItem,
                      mealPreferences.includes(preference) && styles.preferenceItemSelected
                    ]}
                    onPress={() => toggleMealPreference(preference)}
                  >
                    <Text style={[
                      styles.preferenceText,
                      mealPreferences.includes(preference) && styles.preferenceTextSelected
                    ]}>
                      {preference}
                    </Text>
                    {mealPreferences.includes(preference) && (
                      <Icon name="Check" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>

              <Pressable 
                style={[styles.button, { opacity: saving ? 0.6 : 1 }]} 
                onPress={() => {
                  console.log("Button pressed!");
                  save();
                }} 
                disabled={saving}
              >
                <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth < 400 ? 16 : 20, 
    paddingVertical: 16,
  },
  iconBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  title: { 
    fontSize: screenWidth < 400 ? 18 : 20, 
    fontWeight: '700', 
    color: '#fff' 
  },
  scrollContainer: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: screenWidth < 400 ? 12 : 16, 
    borderRadius: 12,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  label: { 
    color: '#374151', 
    fontWeight: '700', 
    marginTop: 10,
    fontSize: screenWidth < 400 ? 14 : 16,
  },
  input: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: screenWidth < 400 ? 10 : 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: '#111827',
    fontSize: screenWidth < 400 ? 14 : 16,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#7b2ff7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenWidth < 400 ? 10 : 12,
    borderRadius: 10,
    minHeight: 48,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '800',
    fontSize: screenWidth < 400 ? 14 : 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  smallBtn: {
    backgroundColor: '#7b2ff7',
    paddingHorizontal: screenWidth < 400 ? 10 : 12,
    paddingVertical: screenWidth < 400 ? 6 : 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: screenWidth < 400 ? 11 : 12,
    fontWeight: '600'
  },
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden'
  },
  suggestionItem: {
    paddingHorizontal: screenWidth < 400 ? 10 : 12,
    paddingVertical: screenWidth < 400 ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  suggestionText: {
    color: '#111827',
    fontSize: screenWidth < 400 ? 13 : 14,
    fontWeight: '600'
  },
  subLabel: {
    color: '#6B7280',
    fontSize: screenWidth < 400 ? 11 : 12,
    marginTop: 2,
    marginBottom: 8
  },
  preferencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: screenWidth < 400 ? 6 : 8,
    marginBottom: 16
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: screenWidth < 400 ? 10 : 12,
    paddingVertical: screenWidth < 400 ? 6 : 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: screenWidth < 400 ? 80 : 100
  },
  preferenceItemSelected: {
    backgroundColor: '#7b2ff7',
    borderColor: '#6d28d9'
  },
  preferenceText: {
    color: '#374151',
    fontSize: screenWidth < 400 ? 11 : 12,
    fontWeight: '500',
    marginRight: 4
  },
  preferenceTextSelected: {
    color: 'white',
    fontWeight: '600'
  }
});


