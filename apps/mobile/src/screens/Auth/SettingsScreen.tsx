import React, { useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

/* ---------------- Types ---------------- */
type SettingsItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
};

/* ---------------- Screen ---------------- */
export default function SettingsScreen({ 
  onBack, 
  onShowSubscription,
  onShowNotifications,
  onShowPreferences
}: { 
  onBack?: () => void;
  onShowSubscription?: () => void;
  onShowNotifications?: () => void;
  onShowPreferences?: () => void;
}) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const gradient = useMemo(
    () => ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const, // purple → hot pink → soft coral
    []
  );

  const settingsItems: SettingsItem[] = [
    {
      id: "subscription",
      title: "Subscription",
      subtitle: "Manage your plan",
      icon: "card",
      onPress: () => {
        onShowSubscription?.();
      },
      showChevron: true,
    },
    {
      id: "preferences",
      title: "User Preferences",
      subtitle: "Location & discovery radius",
      icon: "person-circle",
      onPress: () => onShowPreferences?.(),
      showChevron: true,
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "View your notifications",
      icon: "notifications",
      onPress: () => onShowNotifications?.(),
      showChevron: true,
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      subtitle: "Data and privacy settings",
      icon: "shield-checkmark",
      onPress: () => {
        Alert.alert("Privacy", "Privacy settings coming soon!");
      },
      showChevron: true,
    },
    {
      id: "help",
      title: "Help & Support",
      subtitle: "Get help and contact support",
      icon: "help-circle",
      onPress: () => {
        Alert.alert("Help", "Help center coming soon!");
      },
      showChevron: true,
    },
    {
      id: "about",
      title: "About",
      subtitle: "App version and info",
      icon: "information-circle",
      onPress: () => {
        Alert.alert("About", "Potluck App v1.0.0\nBuilt with React Native & Expo");
      },
      showChevron: true,
    },
    {
      id: "logout",
      title: "Sign Out",
      subtitle: "Sign out of your account",
      icon: "log-out",
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
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>John Doe</Text>
                <Text style={styles.profileEmail}>john.doe@example.com</Text>
              </View>
            </View>
          </View>

          {/* Settings Items */}
          <View style={styles.section}>
            {settingsItems.map((item) => (
              <SettingsItemComponent key={item.id} item={item} />
            ))}
          </View>

          {/* App Version */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>Potluck App v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2024 Potluck. All rights reserved.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------------- Components ---------------- */
function SettingsItemComponent({ item }: { item: SettingsItem }) {
  return (
    <Pressable onPress={item.onPress} style={styles.settingsItem}>
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, item.danger && styles.dangerIcon]}>
          <Ionicons 
            name={item.icon} 
            size={20} 
            color={item.danger ? "#ef4444" : "#7b2ff7"} 
          />
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
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
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
});
