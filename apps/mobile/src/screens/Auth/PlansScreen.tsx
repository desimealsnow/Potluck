import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../config/supabaseClient";
import { paymentService, type BillingPlan, type Subscription } from "../../services/payment.service";
import { PlanCard as PaymentPlanCard } from "../../components/payment";

/* ---------------- Config / REST ---------------- */

/* ---------------- Types ---------------- */
type BillingCycle = "monthly" | "yearly";

/* ---------------- Screen ---------------- */
export default function PlansScreen({ onBack }: { onBack?: () => void }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradient = useMemo(
    () => ["#F2A3FF", "#FF6BAA", "#FF7C7C"] as const, // violet → pink → coral
    []
  );

  // Get current active subscription
  const currentSubscription = subscriptions.find(sub => 
    sub.status === 'active' || sub.status === 'trialing'
  );

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [plansData, subsData] = await Promise.all([
        paymentService.getPlans(),
        paymentService.getSubscriptions(),
      ]);
      
      setPlans(plansData);
      setSubscriptions(subsData);
    } catch (e: any) {
      console.error('Failed to load plans data:', e);
      setError(e.message || 'Failed to load plans data');
      Alert.alert("Error", "Could not load plans. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function selectPlan(plan: BillingPlan) {
    if (currentSubscription && plan.id === currentSubscription.plan_id) return;
    
    try {
      await paymentService.startPayment(plan.id, 'lemonsqueezy');
      // Refresh data after payment attempt
      setTimeout(() => loadData(), 2000);
    } catch (e: any) {
      Alert.alert("Payment Error", e?.message ?? "Failed to start payment process.");
    }
  }

  async function cancelCurrentPlan() {
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

  async function applyPromo() {
    // TODO: Implement promo code validation with backend
    Alert.alert("Coming Soon", "Promo code validation will be available soon.");
  }

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={18} color="#1e1e1e" />
          </Pressable>
          <Text style={styles.title}>Plans</Text>
          <View style={{ width: 36 }} />
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
          {/* Toggle */}
          <Segmented
            options={[
              { key: "monthly", label: "Monthly" },
              { key: "yearly", label: "Yearly" },
            ]}
            value={cycle}
            onChange={(v) => setCycle(v as BillingCycle)}
          />

          {/* Plan cards */}
          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 16 }}>Loading plans...</Text>
            </View>
          ) : plans.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 16 }}>No plans available</Text>
            </View>
          ) : (
            plans.map((plan) => (
              <PaymentPlanCard
                key={plan.id}
                plan={plan}
                isCurrent={currentSubscription?.plan_id === plan.id}
                isPopular={plan.name.toLowerCase().includes('pro')}
                onSelect={() => selectPlan(plan)}
                onCancel={currentSubscription?.plan_id === plan.id ? cancelCurrentPlan : undefined}
                showFeatures={true}
                features={paymentService.getPlanFeatures(plan.name)}
              />
            ))
          )}

          {/* Promo code */}
          <View style={styles.promoCard}>
            <Text style={styles.promoLabel}>Promo Code</Text>
            <View style={styles.promoRow}>
              <TextInput
                value={promo}
                onChangeText={setPromo}
                placeholder="Enter code"
                placeholderTextColor="rgba(0,0,0,0.35)"
                style={styles.promoInput}
              />
              <Pressable onPress={applyPromo} style={styles.applyBtn}>
                <Text style={{ color: "#111", fontWeight: "900" }}>Apply</Text>
              </Pressable>
            </View>
            <Text style={styles.finePrint}>
              By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions renew
              unless canceled. You can cancel anytime.
            </Text>
          </View>

          {/* FAQ */}
          <Text style={styles.faqHeader}>Frequently Asked Questions</Text>
          <FAQ
            q="Can I change my plan later?"
            a="Absolutely. You can upgrade or downgrade anytime; changes prorate on your next billing date."
          />
          <FAQ
            q="What happens during the free trial?"
            a="You get full access to the selected plan. We’ll notify you before the trial ends; you won’t be charged until you confirm."
          />
          <FAQ
            q="How do I cancel my subscription?"
            a="Go to Settings → Billing → Manage Subscription. Cancellation stops future renewals instantly."
          />
          <FAQ
            q="Are there any setup fees?"
            a="No. There are no setup or hidden fees."
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* --------------- Pieces --------------- */


function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.faqItem}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.faqQ}>
        <Text style={styles.faqQText}>{q}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#111" />
      </Pressable>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </View>
  );
}

/* --------------- Styles --------------- */
const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)" },
  title: { fontWeight: "900", color: "#1e1e1e", fontSize: 16 },

  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.35)",
    padding: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  segment: { flex: 1, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontWeight: "800", color: "rgba(0,0,0,0.7)" },
  segmentTextActive: { color: "#111" },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 24,
    marginBottom: 20,
    position: "relative",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 5 },
    }),
  },
  currentCard: {
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  popularCard: {
    borderWidth: 2,
    borderColor: "#FF9800",
  },
  badge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  currentBadge: {
    backgroundColor: "#4CAF50",
  },
  popularBadge: {
    backgroundColor: "#FF9800",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  cardHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { 
    fontSize: 24, 
    fontWeight: "900", 
    color: "#111",
    marginTop: 8,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  price: { 
    fontSize: 32, 
    fontWeight: "900", 
    color: "#111" 
  },
  per: { 
    fontSize: 18, 
    fontWeight: "500", 
    color: "rgba(0,0,0,0.6)",
    marginLeft: 4,
  },
  desc: { 
    color: "rgba(0,0,0,0.65)",
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  features: {
    marginBottom: 20,
  },
  featRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
    marginBottom: 12,
  },
  featText: { 
    color: "#111", 
    fontWeight: "500",
    fontSize: 16,
    flex: 1,
  },

  trialBtn: { 
    alignSelf: "flex-start", 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "#3B82F6",
    marginBottom: 16,
  },
  trialText: { 
    color: "#3B82F6", 
    fontWeight: "600", 
    fontSize: 14 
  },

  chooseBtn: { 
    marginTop: 8, 
    height: 50, 
    borderRadius: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#1e1e1e" 
  },
  currentBtn: {
    backgroundColor: "#9C27B0",
    opacity: 0.8,
  },
  popularBtn: {
    backgroundColor: "#1e1e1e",
  },
  chooseBtnText: { 
    color: "#fff", 
    fontWeight: "900",
    fontSize: 16,
  },
  currentBtnText: {
    color: "#fff",
  },
  popularBtnText: {
    color: "#fff",
  },

  promoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.55)",
    padding: 12,
    marginTop: 2,
  },
  promoLabel: { fontWeight: "900", color: "#111", marginBottom: 8 },
  promoRow: { height: 46, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  promoInput: { flex: 1, color: "#111" },
  applyBtn: { height: 34, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F2F2" },
  finePrint: { marginTop: 8, color: "rgba(0,0,0,0.6)", fontSize: 12 },

  faqHeader: { marginTop: 18, marginBottom: 6, fontWeight: "900", color: "#111" },
  faqItem: { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", marginBottom: 8 },
  faqQ: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12 },
  faqQText: { fontWeight: "800", color: "#111" },
  faqA: { paddingHorizontal: 12, paddingBottom: 12, color: "rgba(0,0,0,0.75)" },
});

