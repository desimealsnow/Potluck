import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/ui";
import Header from "@/layout/Header";
import { apiClient } from "@/services/apiClient";
import { supabase } from "@/config/supabaseClient";

const { width: screenWidth } = Dimensions.get('window');

export default function EditProfileScreen({ onBack }: { onBack?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [sent, setSent] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setDisplayName(session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '');
          setEmail(session.user.email || '');
          
          // Load user profile from our REST API
          try {
            const response = await apiClient.get('/user-profile/me') as any;
            if (response.phone_e164) {
              setPhone(response.phone_e164);
            }
          } catch (apiError) {
            console.log("Could not load phone from API, using default");
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

  const save = useCallback(async () => {
    try {
      setSaving(true);
      
      // Update display name via Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // Update phone if provided
      if (phone && phone !== user?.user_metadata?.phone_e164) {
        try {
          await apiClient.post('/user-profile/phone/send', { phone_e164: phone });
          setSent(true);
          Alert.alert('Code Sent', 'We sent an OTP to your phone. Please verify it to complete the update.');
          return; // Don't close the screen yet
        } catch (phoneError: any) {
          Alert.alert('Phone Update Failed', phoneError?.message ?? 'Could not send verification code');
          return;
        }
      }
      
      Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
      onBack?.();
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [displayName, phone, user, onBack]);

  const verifyOtp = useCallback(async () => {
    try {
      await apiClient.post('/user-profile/phone/verify', { phone_e164: phone, code: otp });
      Alert.alert('Phone Verified', 'Your phone number has been verified and updated.');
      setSent(false);
      setOtp('');
      onBack?.();
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.message ?? 'Invalid OTP');
    }
  }, [phone, otp, onBack]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#351657' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <Header
            onNotifications={() => {}}
            onSettings={() => {}}
            onPlans={() => {}}
            onLogout={() => {}}
            unreadCount={0}
            showNavigation={false}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
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
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: screenWidth < 400 ? 12 : 16 }]}>
            <View style={styles.card}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput 
                style={styles.input} 
                value={displayName} 
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor="#9CA3AF"
              />
              
              <Text style={styles.label}>Email</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: '#f3f4f6' }]} 
                editable={false} 
                value={email} 
              />
              <Text style={styles.subLabel}>Email cannot be changed here. Contact support if needed.</Text>
              
              <Text style={styles.label}>Phone Number</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} 
                  placeholder="+15551234567" 
                  keyboardType="phone-pad" 
                  value={phone} 
                  onChangeText={setPhone} 
                />
                {!sent && phone && phone !== user?.user_metadata?.phone_e164 && (
                  <Pressable style={styles.smallBtn} onPress={async () => {
                    try { 
                      await apiClient.post('/user-profile/phone/send', { phone_e164: phone }); 
                      setSent(true); 
                      Alert.alert('Code Sent', 'We sent an OTP to your phone.'); 
                    } 
                    catch (e: any) { 
                      Alert.alert('Failed', e?.message ?? 'Unknown error'); 
                    }
                  }}>
                    <Text style={styles.smallBtnText}>Verify</Text>
                  </Pressable>
                )}
              </View>
              
              {sent && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <TextInput 
                    style={[styles.input, { flex: 1, marginRight: 8 }]} 
                    placeholder="Enter OTP" 
                    keyboardType="number-pad" 
                    value={otp} 
                    onChangeText={setOtp} 
                  />
                  <Pressable style={[styles.smallBtn, { backgroundColor: '#16a34a' }]} onPress={verifyOtp}>
                    <Text style={styles.smallBtnText}>Submit</Text>
                  </Pressable>
                </View>
              )}
              
              <Pressable 
                style={[styles.button, { opacity: saving ? 0.6 : 1 }]} 
                onPress={save} 
                disabled={saving}
              >
                <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: screenWidth < 400 ? 18 : 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: screenWidth < 400 ? 16 : 20,
    marginBottom: 16,
  },
  label: {
    fontSize: screenWidth < 400 ? 14 : 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  subLabel: {
    fontSize: screenWidth < 400 ? 12 : 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: screenWidth < 400 ? 12 : 16,
    paddingVertical: screenWidth < 400 ? 12 : 14,
    fontSize: screenWidth < 400 ? 14 : 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#A22AD0',
    marginLeft: 8,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: screenWidth < 400 ? 12 : 14,
  },
  button: {
    backgroundColor: '#A22AD0',
    paddingVertical: screenWidth < 400 ? 14 : 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: screenWidth < 400 ? 14 : 16,
  },
});
