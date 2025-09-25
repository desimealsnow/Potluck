import React from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components";
import Header from "@/components/Header";

export default function HelpScreen({ onBack }: { onBack?: () => void }) {
  const faqItems = [
    { question: "How do I create an event?", answer: "Tap the '+' button in the header, fill in details, and tap 'Create'." },
  ];

  const handleContactSupport = () => Linking.openURL('mailto:support@potluck.app?subject=Help Request');

  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Icon name="ChevronLeft" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Pressable style={styles.helpButton} onPress={handleContactSupport}>
              <Icon name="Mail" size={20} color="#7b2ff7" />
              <Text style={styles.helpButtonText}>Contact Support</Text>
              <Icon name="ChevronRight" size={16} color="#6b7280" />
            </Pressable>
            {faqItems.map((item, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              </View>
            ))}
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
  card: { backgroundColor: "rgba(255,255,255,0.95)", padding: 20, borderRadius: 16, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }) },
  helpButton: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "rgba(123, 47, 247, 0.1)", borderRadius: 12, marginBottom: 8 },
  helpButtonText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1f2937", marginLeft: 12 },
  faqItem: { marginTop: 12 },
  faqQuestion: { fontWeight: "800", color: "#1f2937", marginBottom: 4 },
  faqAnswer: { color: "#374151" },
});
