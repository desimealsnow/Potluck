import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components";

export default function HelpScreen({ onBack }: { onBack?: () => void }) {
  const gradient = ["#7b2ff7", "#ff2d91", "#ff8a8a"] as const;

  const faqItems = [
    {
      question: "How do I create an event?",
      answer: "Tap the '+' button in the header, fill in event details, and tap 'Create Event'. You can then invite guests and manage items."
    },
    {
      question: "How do I invite people to my event?",
      answer: "In your event details, go to the 'Participants' tab and tap 'Invite People'. You can share a link or send invitations directly."
    },
    {
      question: "Can I edit event details after creating?",
      answer: "Yes! As the host, you can edit event details, add/remove items, and manage participants from the event details page."
    },
    {
      question: "How do notifications work?",
      answer: "You'll receive notifications for event updates, new invitations, and important reminders. You can manage these in Settings."
    },
    {
      question: "What if I can't attend an event?",
      answer: "You can decline the invitation in the event details. The host will be notified and can adjust the guest list accordingly."
    },
    {
      question: "How do I claim food items?",
      answer: "In the 'Items' tab, tap the '+' button next to any item to claim it. You can also adjust quantities as needed."
    }
  ];

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@potluck.app?subject=Help Request');
  };

  const handleOpenFAQ = () => {
    Linking.openURL('https://potluck.app/faq');
  };

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Icon name="ChevronLeft" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Quick Help</Text>
              <Text style={styles.description}>
                Need immediate assistance? Here are some quick solutions:
              </Text>
              
              <Pressable style={styles.helpButton} onPress={handleContactSupport}>
                <Icon name="Mail" size={20} color="#7b2ff7" />
                <Text style={styles.helpButtonText}>Contact Support</Text>
                <Icon name="ChevronRight" size={16} color="#6b7280" />
              </Pressable>

              <Pressable style={styles.helpButton} onPress={handleOpenFAQ}>
                <Icon name="CircleHelp" size={20} color="#7b2ff7" />
                <Text style={styles.helpButtonText}>Browse FAQ</Text>
                <Icon name="ChevronRight" size={16} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              
              {faqItems.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Getting Started</Text>
              <View style={styles.stepList}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Create your first event</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Add food items and details</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Invite guests and start planning</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <Text style={styles.description}>
                Can't find what you're looking for? We're here to help!
              </Text>
              
              <View style={styles.contactItem}>
                <Icon name="Mail" size={16} color="#6b7280" />
                <Text style={styles.contactText}>support@potluck.app</Text>
              </View>
              
              <View style={styles.contactItem}>
                <Icon name="Clock" size={16} color="#6b7280" />
                <Text style={styles.contactText}>Response time: Within 24 hours</Text>
              </View>
              
              <View style={styles.contactItem}>
                <Icon name="Globe" size={16} color="#6b7280" />
                <Text style={styles.contactText}>www.potluck.app/help</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
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
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(123, 47, 247, 0.1)",
    borderRadius: 12,
    marginBottom: 8,
  },
  helpButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 12,
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  stepList: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7b2ff7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  stepText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
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
