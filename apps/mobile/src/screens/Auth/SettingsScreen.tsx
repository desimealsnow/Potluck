import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components";
import Header from "@/components/Header";
import { useTheme } from "@/theme";
import { supabase } from "../../config/supabaseClient";
import { apiClient } from "../../services/apiClient";
import type { User } from "@supabase/supabase-js";

/* ---------------- Types ---------------- */
type SettingsItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: import("@/components/ui/Icon").IconName;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
};

/* ---------------- Screen ---------------- */
export default function SettingsScreen({ 
  onBack, 
  onShowSubscription,
  onShowUserProfile,
  onShowPreferences,
  onShowMyItems,
  onShowPaymentMethods,
  onShowInvoices,
  onShowMyJoinRequests,
  onShowAbout,
  onShowPrivacy,
  onShowHelp
}: { 
  onBack?: () => void;
  onShowSubscription?: () => void;
  onShowUserProfile?: () => void;
  onShowPreferences?: () => void;
  onShowMyItems?: () => void;
  onShowPaymentMethods?: () => void;
  onShowInvoices?: () => void;
  onShowMyJoinRequests?: () => void;
  onShowAbout?: () => void;
  onShowPrivacy?: () => void;
  onShowHelp?: () => void;
}) {
  const { mode, setMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const gradient = useMemo(
    () => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, // purple → hot pink → soft coral
    []
  );

  // Get current user data
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // Load user profile from our REST API
          try {
            console.log("Settings: Loading user profile from REST API...");
            const response = await apiClient.get('/user-profile/me') as any;
            console.log("Settings: Profile response:", response);
            
            if (response.meal_preferences) {
              console.log("Settings: Updating user metadata with profile data:", response.meal_preferences);
              // Update user metadata with profile data
              const { error: updateError } = await supabase.auth.updateUser({
                data: { meal_preferences: response.meal_preferences }
              });
              
              if (!updateError) {
                // Update local user state to reflect the changes
                setUser(prev => prev ? {
                  ...prev,
                  user_metadata: {
                    ...prev.user_metadata,
                    meal_preferences: response.meal_preferences
                  }
                } : null);
              } else {
                console.error("Failed to update user metadata:", updateError);
              }
            }
          } catch (apiError) {
            console.log("Settings: Could not load profile from API:", apiError);
          }
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getCurrentUser();
  }, []);

  const settingsItems: SettingsItem[] = [
    {
      id: "subscription",
      title: "Subscription",
      subtitle: "Manage your plan",
      icon: "CreditCard",
      onPress: () => {
        onShowSubscription?.();
      },
      showChevron: true,
    },
    // {
    //   id: "payment-methods",
    //   title: "Payment Methods",
    //   subtitle: "Manage saved cards or methods",
    //   icon: "Wallet",
    //   onPress: () => onShowPaymentMethods?.(),
    //   showChevron: true,
    // },
    {
      id: "invoices",
      title: "Invoices",
      subtitle: "View and download invoices",
      icon: "Receipt",
      onPress: () => onShowInvoices?.(),
      showChevron: true,
    },
    {
      id: "my-join-requests",
      title: "My Join Requests",
      subtitle: "Requests you’ve made to join events",
      icon: "Send",
      onPress: () => onShowMyJoinRequests?.(),
      showChevron: true,
    },
    {
      id: "my-items",
      title: "My Items",
      subtitle: "Manage your saved item templates",
      icon: "List",
      onPress: () => onShowMyItems?.(),
      showChevron: true,
    },
    {
      id: "preferences",
      title: "User Preferences",
      subtitle: "Profile and account settings",
      icon: "User",
      onPress: () => onShowPreferences?.(),
      showChevron: true,
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      subtitle: "Data and privacy settings",
      icon: "ShieldCheck",
      onPress: () => onShowPrivacy?.(),
      showChevron: true,
    },
    {
      id: "help",
      title: "Help & Support",
      subtitle: "Get help and contact support",
      icon: "Hand",
      onPress: () => onShowHelp?.(),
      showChevron: true,
    },
    {
      id: "about",
      title: "About",
      subtitle: "App version and info",
      icon: "Info",
      onPress: () => onShowAbout?.(),
      showChevron: true,
    },
    {
      id: "logout",
      title: "Sign Out",
      subtitle: "Sign out of your account",
      icon: "LogOut",
      onPress: () => {
        Alert.alert(
          "Sign Out",
          "Are you sure you want to sign out?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: () => {
              // Handle logout
              Alert.alert("Signed Out", "You have been signed out successfully.");
            }}
          ]
        );
      },
      showChevron: false,
      danger: true,
    },
  ];

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
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.section}>
          <Pressable onPress={onShowUserProfile} style={styles.profileCard}>
            <View style={styles.avatar}>
              <Icon name="User" size={28} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
              {user?.user_metadata?.meal_preferences && user.user_metadata.meal_preferences.length > 0 && (
                <View style={styles.mealPreferencesContainer}>
                  <Text style={styles.mealPreferencesLabel}>Dietary Preferences:</Text>
                  <View style={styles.mealPreferencesTags}>
                    {user.user_metadata.meal_preferences.map((preference: string, index: number) => (
                      <View key={index} style={styles.mealPreferenceTag}>
                        <Text style={styles.mealPreferenceText}>{preference}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </Pressable>
          </View>

          {/* Settings Items */}
          <View style={styles.section}>
            {settingsItems.map((item) => (
              <SettingsItemComponent key={item.id} item={item} />
            ))}
          </View>

          {/* Theme toggle */}
          <View style={styles.section}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.iconContainer}>
                  <Icon name="Moon" size={20} color="#7b2ff7" />
                </View>
                <View style={styles.settingsItemText}>
                  <Text style={styles.settingsItemTitle}>Appearance</Text>
                  <Text style={styles.settingsItemSubtitle}>{mode === 'system' ? 'Match System' : mode === 'dark' ? 'Dark' : 'Light'}</Text>
                </View>
              </View>
              <Pressable onPress={() => setMode(mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system')}>
                <Icon name="SwitchCamera" size={18} color="#9ca3af" />
              </Pressable>
            </View>
          </View>

          {/* App Version */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>Potluck App v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2024 Potluck. All rights reserved.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- Components ---------------- */
function SettingsItemComponent({ item }: { item: SettingsItem }) {
  return (
    <Pressable onPress={item.onPress} style={styles.settingsItem}>
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, item.danger && styles.dangerIcon]}>
          <Icon name={item.icon as any} size={20} color={item.danger ? "#ef4444" : "#7b2ff7"} />
        </View>
        <View style={styles.settingsItemText}>
          <Text style={[styles.settingsItemTitle, item.danger && styles.dangerText]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.settingsItemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      {item.showChevron && (
        <Icon name="ChevronRight" size={16} color="#9ca3af" />
      )}
    </Pressable>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7b2ff7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(123, 47, 247, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  dangerText: {
    color: "#ef4444",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  mealPreferencesContainer: {
    marginTop: 8,
  },
  mealPreferencesLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
    fontWeight: "500",
  },
  mealPreferencesTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  mealPreferenceTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  mealPreferenceText: {
    fontSize: 11,
    color: "#1f2937",
    fontWeight: "500",
  },
});
