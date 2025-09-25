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
import { Icon } from "@/ui";
import Header from "@/layout/Header";

export default function AboutScreen({ onBack }: { onBack?: () => void }) {
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
          <Text style={styles.title}>About</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.appInfo}>
                <View style={styles.appIcon}>
                  <Icon name="Utensils" size={40} color="#7b2ff7" />
                </View>
                <Text style={styles.appName}>Potluck</Text>
                <Text style={styles.appVersion}>Version 1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>What is Potluck?</Text>
              <Text style={styles.description}>
                Potluck is a modern app that helps you organize and manage potluck events with friends, family, and colleagues. 
                Create events, invite guests, manage food items, and coordinate everything in one place.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Icon name="Calendar" size={16} color="#7b2ff7" />
                  <Text style={styles.featureText}>Event Management</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="Users" size={16} color="#7b2ff7" />
                  <Text style={styles.featureText}>Guest Coordination</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="Utensils" size={16} color="#7b2ff7" />
                  <Text style={styles.featureText}>Food Item Tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="MapPin" size={16} color="#7b2ff7" />
                  <Text style={styles.featureText}>Location Discovery</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="Bell" size={16} color="#7b2ff7" />
                  <Text style={styles.featureText}>Smart Notifications</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Technology</Text>
              <Text style={styles.description}>
                Built with React Native and Expo for cross-platform compatibility. 
                Powered by Supabase for authentication and real-time features.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <Text style={styles.description}>
                Questions or feedback? We'd love to hear from you!
              </Text>
              <Text style={styles.contactInfo}>
                Email: support@potluck.app{'\n'}
                Website: www.potluck.app
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.copyrightText}>© 2024 Potluck. All rights reserved.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  appInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(123, 47, 247, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    color: "#6b7280",
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
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
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
  copyrightText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
});
