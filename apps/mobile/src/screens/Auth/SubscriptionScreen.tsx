import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { paymentService, type Subscription, type Invoice } from "../../services/payment.service";
import { PlanCard, InvoiceCard } from "../../components/payment";

/* ---------------- Types ---------------- */
type PlanId = "free" | "pro" | "team";

/* ---------------- Screen ---------------- */
export default function SubscriptionScreen({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const gradient = useMemo(
    () => ["#EEDBFF", "#FFC6E2", "#C9F0FF"] as const, // soft, playful
    []
  );

  // Get current active subscription
  const currentSubscription = subscriptions.find(sub => 
    sub.status === 'active' || sub.status === 'trialing'
  );

  /** Load data */
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [subs, inv] = await Promise.all([
        paymentService.getSubscriptions(),
        paymentService.getInvoices(),
      ]);
      
      setSubscriptions(subs);
      setInvoices(inv);
    } catch (e: any) {
      console.error('Failed to load subscription data:', e);
      setError(e.message || 'Failed to load subscription data');
      Alert.alert("Error", "Could not load subscription data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /** initial load */
  useEffect(() => {
    loadData();
  }, []);

  /** Actions */
  async function startPayment(planId: string) {
    try {
      await paymentService.startPayment(planId, 'lemonsqueezy');
      // Refresh data after payment attempt
      setTimeout(() => loadData(), 2000);
    } catch (e: any) {
      Alert.alert("Payment Error", e?.message ?? "Failed to start payment process.");
    }
  }

  async function updatePayment() {
    try {
      await paymentService.updatePaymentMethod();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not start payment update.");
    }
  }

  async function cancelSubscription() {
    if (!currentSubscription) return;
    
    Alert.alert("Cancel subscription?", "You can re-subscribe anytime.", [
      { text: "Keep Plan", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await paymentService.cancelSubscription(currentSubscription.id);
            Alert.alert("Canceled", "Your subscription has been canceled.");
            loadData(); // Refresh data
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not cancel subscription.");
          }
        },
      },
    ]);
  }

  async function downloadInvoice(invoiceId: string) {
    try {
      await paymentService.downloadInvoice(invoiceId);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not download invoice.");
    }
  }

  const hasActivePlan = !!currentSubscription;

  if (loading) {
    return (
      <LinearGradient colors={gradient} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Loading...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={18} color="#2a2a2a" />
          </Pressable>
          <Text style={styles.topTitle}>My Potluck Subscription</Text>
          <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="moon" size={16} color="#9B7C4D" />
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#fff"
            />
          }
        >
          {/* Status banner */}
          {hasActivePlan ? (
            <View style={styles.bannerGreen}>
              <Ionicons name="checkmark-circle" size={18} color="#0B5E3B" />
              <Text style={styles.bannerGreenText}>
                🎉 Your potluck subscription is <Text style={{ fontWeight: "900" }}>active</Text>!
              </Text>
            </View>
          ) : (
            <View style={styles.bannerNeutral}>
              <Ionicons name="information-circle" size={18} color="#6B7280" />
              <Text style={styles.bannerNeutralText}>No active plan. Pick a plan to get started.</Text>
            </View>
          )}

          {/* Current subscription or empty state */}
          {hasActivePlan && currentSubscription ? (
            <View style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.planTitle}>
                  🍲 {paymentService.getPlanDisplayName(currentSubscription.plan_id)} <Text style={{ fontSize: 12 }}>👑 🍽️</Text>
                </Text>
                <Ionicons name="sparkles" size={16} color="#E69A2E" />
              </View>

              <Text style={styles.price}>
                {paymentService.formatAmount(0, 'usd')}/month <Text style={{ color: "#12A150" }}>• 🎉</Text>
              </Text>

              <View style={{ marginTop: 12, gap: 8 }}>
                <Row 
                  label="Status" 
                  value={paymentService.formatStatus(currentSubscription.status).text} 
                />
                <Row
                  label="Renews on"
                  value={currentSubscription.current_period_end ? 
                    new Date(currentSubscription.current_period_end).toLocaleDateString() : "—"
                  }
                />
                <Row label="Provider" value={currentSubscription.provider} />
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Subscription Yet</Text>
              <Text style={styles.emptyText}>Enjoy premium features like unlimited events, smarter AI, and more.</Text>
              <Pressable onPress={() => startPayment("pro")} style={styles.bigCta}>
                <Text style={styles.bigCtaText}>Get Started</Text>
              </Pressable>
            </View>
          )}

          {/* Action buttons for active subscription */}
          {hasActivePlan && currentSubscription && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={updatePayment}>
                <Ionicons name="card" size={16} color="#166F4D" />
                <Text style={[styles.secondaryBtnText, { color: "#166F4D" }]}>Update Payment</Text>
              </Pressable>
              <Pressable 
                style={[styles.secondaryBtn, { flex: 1, backgroundColor: "#FFE6DC", borderColor: "#FFD0BD" }]} 
                onPress={cancelSubscription}
              >
                <Ionicons name="close" size={16} color="#AA3A2A" />
                <Text style={[styles.secondaryBtnText, { color: "#AA3A2A" }]}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* Invoices */}
          {invoices.length > 0 && (
            <>
              <Text style={styles.invoicesHeader}>Recent Invoices</Text>
              {invoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  onDownload={() => downloadInvoice(invoice.id)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------------- Small pieces ---------------- */
function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {icon ? <Ionicons name={icon} size={14} color="#6B7280" /> : null}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Pill({ text, tone }: { text: string; tone: "green" | "amber" }) {
  const map = {
    green: { bg: "#D1FAE5", fg: "#065F46" },
    amber: { bg: "#FEF3C7", fg: "#92400E" },
  } as const;
  return (
    <View style={{ backgroundColor: map[tone].bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: map[tone].fg, fontWeight: "900", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function date(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontWeight: "900", color: "#8A36C1" },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  bannerGreen: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#CFF9E5",
    borderWidth: 1,
    borderColor: "#A3EED1",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bannerGreenText: { color: "#0B5E3B", fontWeight: "800" },
  bannerNeutral: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bannerNeutralText: { color: "#4B5563", fontWeight: "700" },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 },
    }),
  },
  planTitle: { fontWeight: "900", color: "#D24A63" },
  price: { marginTop: 6, fontSize: 26, fontWeight: "900", color: "#EB4C4C" },

  bigGradientBtn: { marginBottom: 10 },
  bigGradientInner: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bigGradientText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBEFDA",
    backgroundColor: "#E7FBF0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryBtnText: { fontWeight: "900" },

  empty: {
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },
  emptyTitle: { fontWeight: "900", color: "#6C2BD2" },
  emptyText: { textAlign: "center", marginTop: 6, color: "#6B7280" },
  bigCta: { marginTop: 10, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0B16", paddingHorizontal: 16 },
  bigCtaText: { color: "#fff", fontWeight: "900" },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { color: "#6B7280", fontWeight: "800" },
  rowValue: { color: "#111", fontWeight: "800" },

  invoicesHeader: { marginTop: 16, marginBottom: 6, fontWeight: "900", color: "#111" },
  invoiceRow: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#E9FFF3",
    borderWidth: 1,
    borderColor: "#C8F7DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  invDate: { fontWeight: "900", color: "#111" },
  invAmount: { color: "#6B7280", marginTop: 2, fontWeight: "700" },

  iconOnly: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
});

