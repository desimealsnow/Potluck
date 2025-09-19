import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function PrivacyScreen({ onBack }: { onBack?: () => void }) {
  const gradient = ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const;

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Privacy & Security</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Collection</Text>
              <Text style={styles.description}>
                We collect only the information necessary to provide our service:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Email address for account creation and notifications</Text>
                <Text style={styles.listItem}>• Event data you create (titles, dates, locations)</Text>
                <Text style={styles.listItem}>• Location data (only when you enable nearby events)</Text>
                <Text style={styles.listItem}>• Device information for app functionality</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Usage</Text>
              <Text style={styles.description}>
                Your data is used to:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Provide event management features</Text>
                <Text style={styles.listItem}>• Send you relevant notifications</Text>
                <Text style={styles.listItem}>• Improve app performance and features</Text>
                <Text style={styles.listItem}>• Ensure app security and prevent abuse</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Sharing</Text>
              <Text style={styles.description}>
                We do not sell, trade, or share your personal information with third parties, except:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• When required by law</Text>
                <Text style={styles.listItem}>• To protect our rights and safety</Text>
                <Text style={styles.listItem}>• With your explicit consent</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Security</Text>
              <Text style={styles.description}>
                We implement industry-standard security measures:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• End-to-end encryption for sensitive data</Text>
                <Text style={styles.listItem}>• Secure cloud storage with Supabase</Text>
                <Text style={styles.listItem}>• Regular security audits and updates</Text>
                <Text style={styles.listItem}>• Access controls and authentication</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your Rights</Text>
              <Text style={styles.description}>
                You have the right to:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Access your personal data</Text>
                <Text style={styles.listItem}>• Correct inaccurate information</Text>
                <Text style={styles.listItem}>• Delete your account and data</Text>
                <Text style={styles.listItem}>• Export your data</Text>
                <Text style={styles.listItem}>• Opt out of non-essential communications</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cookies & Tracking</Text>
              <Text style={styles.description}>
                We use minimal tracking for app functionality and analytics. 
                You can control tracking preferences in your device settings.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact Us</Text>
              <Text style={styles.description}>
                Questions about privacy? Contact us:
              </Text>
              <Text style={styles.contactInfo}>
                Email: privacy@potluck.app{'\n'}
                Data Protection Officer: dpo@potluck.app
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.lastUpdated}>Last updated: December 2024</Text>
            <Text style={styles.copyrightText}>© 2024 Potluck. All rights reserved.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
  },
  list: {
    marginTop: 8,
  },
  listItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
});
