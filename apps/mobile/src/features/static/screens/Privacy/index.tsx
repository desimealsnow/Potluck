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
import { Icon } from "@/components";
import Header from "@/components/Header";

export default function PrivacyScreen({ onBack }: { onBack?: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Icon name="ChevronLeft" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Privacy & Security</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Collection</Text>
              <Text style={styles.description}>We collect only the information necessary to provide our service:</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Email address for account creation and notifications</Text>
                <Text style={styles.listItem}>• Event data you create (titles, dates, locations)</Text>
                <Text style={styles.listItem}>• Location data (only when you enable nearby events)</Text>
                <Text style={styles.listItem}>• Device information for app functionality</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  scroll: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  card: { backgroundColor: "rgba(255,255,255,0.95)", padding: 20, borderRadius: 16, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }) },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 12 },
  description: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 8 },
  list: { marginTop: 8 },
  listItem: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 4 },
});
