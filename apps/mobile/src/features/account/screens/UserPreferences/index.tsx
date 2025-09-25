import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components";
import Header from "@/components/Header";
import { apiClient } from "@/services/apiClient";
import { supabase } from "@/config/supabaseClient";
const { width: screenWidth } = Dimensions.get('window');
export default function UserPreferencesScreen({ onBack }: { onBack?: () => void }) {
  const [city, setCity] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<string>("25");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mealPreferences, setMealPreferences] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  useEffect(() => { (async () => { try { const { data: { session } } = await supabase.auth.getSession(); if (session?.user) { setUser(session.user); const response = await apiClient.get('/user-profile/me') as any; if (response.meal_preferences) setMealPreferences(response.meal_preferences); if (response.city) setCity(response.city); if (response.discoverability_radius_km) setRadiusKm(response.discoverability_radius_km.toString()); } } catch {} finally { setLoading(false); } })(); }, []);
  const toggleMealPreference = (p: string) => setMealPreferences(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const save = useCallback(async () => { setSaving(true); try { const payload: any = { display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User', meal_preferences: mealPreferences, city, discoverability_radius_km: Math.max(1, Math.min(200, parseInt(radiusKm || '25', 10))) }; await apiClient.post('/user-profile/setup', payload); Alert.alert('Preferences saved', 'Your preferences have been updated.'); onBack?.(); } catch (e: any) { Alert.alert('Save failed', e?.message ?? 'Unknown error'); } finally { setSaving(false); } }, [mealPreferences, city, radiusKm, user, onBack]);
  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={20} color="#fff" /></Pressable>
          <Text style={styles.title}>User Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: screenWidth < 400 ? 12 : 16 }]}>
            {loading && (<View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#fff" /><Text style={styles.loadingText}>Loading preferences...</Text></View>)}
            <View style={styles.card}>
              <Text style={styles.label}>City (optional)</Text>
              <TextInput value={city} onChangeText={setCity} placeholder="San Francisco" placeholderTextColor="#9CA3AF" style={styles.input} />
              <Text style={styles.label}>Discovery Radius (km)</Text>
              <TextInput value={radiusKm} onChangeText={setRadiusKm} placeholder="25" placeholderTextColor="#9CA3AF" keyboardType="number-pad" style={styles.input} />
              <Text style={styles.label}>Dietary Preferences</Text>
              <Text style={styles.subLabel}>Select your dietary preferences to help us suggest better events</Text>
              <View style={styles.preferencesContainer}>
                {["Vegetarian","Vegan","Gluten-Free","Dairy-Free","Nut-Free","Halal","Kosher","No Spicy Food"].map((preference) => (
                  <Pressable key={preference} style={[styles.preferenceItem, mealPreferences.includes(preference) && styles.preferenceItemSelected]} onPress={() => toggleMealPreference(preference)}>
                    <Text style={[styles.preferenceText, mealPreferences.includes(preference) && styles.preferenceTextSelected]}>{preference}</Text>
                    {mealPreferences.includes(preference) && (<Icon name="Check" size={16} color="#fff" />)}
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.button, { opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Preferences'}</Text></Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: screenWidth < 400 ? 16 : 20, paddingVertical: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: screenWidth < 400 ? 18 : 20, fontWeight: '700', color: '#fff' },
  scrollContainer: { paddingVertical: 16, paddingBottom: 32 },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', padding: screenWidth < 400 ? 12 : 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  label: { color: '#374151', fontWeight: '700', marginTop: 10, fontSize: screenWidth < 400 ? 14 : 16 },
  input: { marginTop: 6, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: screenWidth < 400 ? 10 : 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, color: '#111827', fontSize: screenWidth < 400 ? 14 : 16 },
  button: { marginTop: 16, backgroundColor: '#7b2ff7', alignItems: 'center', justifyContent: 'center', paddingVertical: screenWidth < 400 ? 10 : 12, borderRadius: 10, minHeight: 48 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: screenWidth < 400 ? 14 : 16 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
  subLabel: { color: '#6B7280', fontSize: screenWidth < 400 ? 11 : 12, marginTop: 2, marginBottom: 8 },
  preferencesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: screenWidth < 400 ? 6 : 8, marginBottom: 16 },
  preferenceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: screenWidth < 400 ? 10 : 12, paddingVertical: screenWidth < 400 ? 6 : 8, borderWidth: 1, borderColor: '#E5E7EB', minWidth: screenWidth < 400 ? 80 : 100 },
  preferenceItemSelected: { backgroundColor: '#7b2ff7', borderColor: '#6d28d9' },
  preferenceText: { color: '#374151', fontSize: screenWidth < 400 ? 11 : 12, fontWeight: '500', marginRight: 4 },
  preferenceTextSelected: { color: 'white', fontWeight: '600' },
})
