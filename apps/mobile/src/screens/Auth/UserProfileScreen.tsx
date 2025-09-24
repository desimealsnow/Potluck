import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components";
import Header from "@/components/Header";
import { supabase } from "../../config/supabaseClient";
import { apiClient } from "@/services/apiClient";
import type { User } from "@supabase/supabase-js";

const { width: screenWidth } = Dimensions.get('window');

export default function UserProfileScreen({ 
  onBack, 
  onEditProfile 
}: { 
  onBack?: () => void;
  onEditProfile?: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ phone_e164?: string | null; phone_verified?: boolean } | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.get<any>('/user-profile/me');
        setProfile({ phone_e164: data?.phone_e164 ?? null, phone_verified: data?.phone_verified ?? false });
      } catch (e) {
        // ignore
      }
    };
    fetchProfile();
  }, []);

  const gradient = ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const;

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
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={[styles.scrollContainer, { paddingHorizontal: screenWidth < 400 ? 12 : 16 }]}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Icon name="User" size={40} color="#fff" />
              </View>
              <Pressable onPress={onEditProfile} style={styles.editButton}>
                <Icon name="Pencil" size={16} color="#7b2ff7" />
              </Pressable>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>

            {/* Phone status */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '600' }}>Phone Number</Text>
              {profile?.phone_e164 ? (
                <Text style={{ fontSize: 16, color: '#111827', marginTop: 2 }}>
                  {profile.phone_e164} {profile.phone_verified ? '' : <Text style={{ color: '#B45309' }}>• Unverified</Text>}
                </Text>
              ) : (
                <Text style={{ fontSize: 16, color: '#B45309', marginTop: 2 }}>Unverified</Text>
              )}
            </View>
              
              {user?.user_metadata?.meal_preferences && user.user_metadata.meal_preferences.length > 0 && (
                <View style={styles.preferencesContainer}>
                  <Text style={styles.preferencesLabel}>Dietary Preferences:</Text>
                  <View style={styles.preferencesTags}>
                    {user.user_metadata.meal_preferences.map((preference: string, index: number) => (
                      <View key={index} style={styles.preferenceTag}>
                        <Text style={styles.preferenceText}>{preference}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Icon name="Calendar" size={24} color="#7b2ff7" />
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Events Hosted</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="Users" size={24} color="#7b2ff7" />
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Events Joined</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="Star" size={24} color="#7b2ff7" />
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Items Created</Text>
              </View>
            </View>
          </View>

        </ScrollView>
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
    flex: 1,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: screenWidth < 400 ? 16 : 20,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7b2ff7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: screenWidth < 400 ? 20 : 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: screenWidth < 400 ? 14 : 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  preferencesContainer: {
    marginTop: 8,
  },
  preferencesLabel: {
    fontSize: screenWidth < 400 ? 12 : 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  preferencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  preferenceTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  preferenceText: {
    fontSize: screenWidth < 400 ? 11 : 12,
    color: '#1f2937',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: screenWidth < 400 ? 16 : 20,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  statsTitle: {
    fontSize: screenWidth < 400 ? 16 : 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: screenWidth < 400 ? 20 : 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: screenWidth < 400 ? 11 : 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
