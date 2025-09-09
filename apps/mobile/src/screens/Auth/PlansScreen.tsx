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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../config/supabaseClient";

/* ---------------- Config / REST ---------------- */
const API_BASE_URL = "http://localhost:3000/api/v1"; // Backend server URL
const USE_MOCK = false; // Use real API

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCK) return mockApi<T>(path, init);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {})
  };
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }
  
  return res.json();
}

/* ---------------- Types ---------------- */
type BillingCycle = "monthly" | "yearly";
type Feature = { label: string; included: boolean };
type Plan = {
  id: string;
  name: string;
  desc: string;
  monthly: number;   // price per month (₹)
  yearly: number;    // price per month if billed yearly (for display)
  features: Feature[];
  badge?: "current" | "popular";
  trialTag?: string; // e.g., "14-day free trial"
};

/* ---------------- Screen ---------------- */
export default function PlansScreen({ onBack }: { onBack?: () => void }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string>("free");
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const gradient = useMemo(
    () => ["#F2A3FF", "#FF6BAA", "#FF7C7C"] as const, // violet → pink → coral
    []
  );

  useEffect(() => {
    loadPlans();
    loadCurrentSubscription();
  }, []);

  async function loadPlans() {
    try {
      console.log("Loading plans...");
      setLoading(true);
      const data = await api<any[]>("/billing/plans");
      console.log("Plans data:", data);
      const mappedPlans = data.map(plan => ({
        id: plan.id,
        name: plan.name,
        desc: `${plan.name} subscription plan`,
        monthly: plan.interval === "month" ? plan.amount_cents / 100 : (plan.amount_cents / 100) / 12,
        yearly: plan.interval === "year" ? (plan.amount_cents / 100) / 12 : plan.amount_cents / 100,
        features: getFeaturesByPlan(plan.name),
        badge: plan.name.toLowerCase().includes("pro") ? "popular" as const : undefined
      }));
      console.log("Mapped plans:", mappedPlans);
      setPlans(mappedPlans);
    } catch (e) {
      console.warn("Failed to load plans:", e);
      // Fallback to mock data if API fails
      const mockPlans = [
        {
          id: "free",
          name: "Free",
          desc: "Perfect for getting started",
          monthly: 0,
          yearly: 0,
          features: getFeaturesByPlan("free"),
          badge: "current" as const
        },
        {
          id: "pro",
          name: "Pro",
          desc: "Best for growing businesses",
          monthly: 299,
          yearly: 249,
          features: getFeaturesByPlan("pro"),
          badge: "popular" as const,
          trialTag: "14-day free trial"
        }
      ];
      setPlans(mockPlans);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentSubscription() {
    try {
      const subscriptions = await api<any[]>("/billing/subscriptions");
      if (subscriptions.length > 0) {
        setCurrentPlanId(subscriptions[0].plan_id);
      }
    } catch (e) {
      console.warn("Failed to load subscription:", e);
    }
  }

  function getFeaturesByPlan(planName: string) {
    const name = planName.toLowerCase();
    if (name.includes("free")) {
      return [
        { label: "Up to 3 events per month", included: true },
        { label: "Basic participant management", included: true },
        { label: "Email notifications", included: true },
        { label: "Advanced analytics", included: false },
        { label: "Custom branding", included: false },
        { label: "Priority support", included: false },
      ];
    }
    return [
      { label: "Unlimited events", included: true },
      { label: "Advanced participant management", included: true },
      { label: "Email & SMS notifications", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Custom branding", included: true },
      { label: "Priority support", included: true },
    ];
  }

  const priceOf = (p: Plan) => (cycle === "monthly" ? p.monthly : p.yearly);
  const cycleLabel = cycle === "monthly" ? "mo" : "mo";

  async function choose(plan: Plan) {
    if (plan.id === currentPlanId) return;
    try {
      await api(`/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle: cycle,
          promoCode: appliedPromo ?? undefined,
        }),
      });
      setCurrentPlanId(plan.id);
      Alert.alert("Success", `You're on the ${plan.name} plan now.`);
      // optionally: onBack?.();
    } catch (e: any) {
      Alert.alert("Subscription failed", e?.message ?? "Unknown error");
    }
  }

  async function applyPromo() {
    try {
      const r: any = await api(`/promo/validate?code=${encodeURIComponent(promo)}`);
      if (r.valid) {
        setAppliedPromo(promo.trim());
        Alert.alert("Promo applied", r.message ?? "Discount will be reflected at checkout.");
      } else {
        Alert.alert("Invalid code", r.message ?? "Please try a different code.");
      }
    } catch {
      Alert.alert("Error", "Couldn't validate promo code right now.");
    }
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

        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          {/* Toggle */}
          <Segmented
            options={[
              { key: "monthly", label: "Monthly" },
              { key: "yearly", label: "Yearly" },
            ]}
            value={cycle}
            onChange={(v) => setCycle(v as BillingCycle)}
          />

          {/* Debug info */}
          <Text style={{ color: 'white', textAlign: 'center', marginBottom: 10 }}>
            Plans loaded: {plans.length} | Loading: {loading ? 'Yes' : 'No'}
          </Text>

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
            plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                price={priceOf(p)}
                cycleLabel={cycleLabel}
                current={currentPlanId === p.id}
                onChoose={() => choose(p)}
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
function PlanCard({
  plan,
  price,
  cycleLabel,
  current,
  onChoose,
}: {
  plan: Plan;
  price: number;
  cycleLabel: string;
  current?: boolean;
  onChoose: () => void;
}) {
  return (
    <View style={[styles.card, current && styles.currentCard, plan.badge === "popular" && styles.popularCard]}>
      {/* Badge */}
      {plan.badge && (
        <View style={[styles.badge, plan.badge === "current" && styles.currentBadge, plan.badge === "popular" && styles.popularBadge]}>
          {plan.badge === "popular" && <Ionicons name="star" size={12} color="#fff" style={{ marginRight: 4 }} />}
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      )}

      {/* Plan Name */}
      <Text style={styles.planName}>{plan.name}</Text>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{price}</Text>
        <Text style={styles.per}>/{cycleLabel}</Text>
      </View>

      {/* Description */}
      <Text style={styles.desc}>{plan.desc}</Text>

      {/* Features */}
      <View style={styles.features}>
        {plan.features.map((f, i) => (
          <FeatureRow key={i} label={f.label} included={f.included} />
        ))}
      </View>

      {/* Trial Tag */}
      {plan.trialTag && (
        <Pressable style={styles.trialBtn}>
          <Text style={styles.trialText}>{plan.trialTag}</Text>
        </Pressable>
      )}

      {/* Choose Button */}
      <Pressable
        disabled={current}
        onPress={onChoose}
        style={[
          styles.chooseBtn, 
          current && styles.currentBtn,
          plan.badge === "popular" && styles.popularBtn
        ]}
      >
        <Text style={[
          styles.chooseBtnText,
          current && styles.currentBtnText,
          plan.badge === "popular" && styles.popularBtnText
        ]}>
          {current ? "Current Plan" : "Choose Plan"}
        </Text>
      </Pressable>
    </View>
  );
}

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <View style={styles.featRow}>
      <Ionicons
        name={included ? "checkmark-circle" : "remove-circle"}
        size={16}
        color={included ? "#10B981" : "rgba(0,0,0,0.35)"}
      />
      <Text style={[styles.featText, !included && { color: "rgba(0,0,0,0.35)" }]}>{label}</Text>
    </View>
  );
}

function Badge({ text, tone }: { text: string; tone: "green" | "amber" }) {
  const map = {
    green: { bg: "#D1FAE5", fg: "#065F46" },
    amber: { bg: "#FEF3C7", fg: "#92400E" },
  } as const;
  return (
    <View style={{ backgroundColor: map[tone].bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: map[tone].fg, fontWeight: "900", fontSize: 11 }}>{text}</Text>
    </View>
  );
}

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

/* ---------------- Mock API (delete when live) ---------------- */
async function mockApi<T>(path: string, _init?: RequestInit): Promise<any> {
  await new Promise((r) => setTimeout(r, 180));
  if (path === "/plans") {
    const data: Plan[] = [
      {
        id: "free",
        name: "Free",
        desc: "Perfect for getting started",
        monthly: 0,
        yearly: 0,
        badge: "current",
        features: [
          { label: "Up to 5 events", included: true },
          { label: "Up to 10 guests", included: true },
          { label: "Basic AI agent", included: true },
          { label: "Payment processing", included: false },
        ],
      },
      {
        id: "pro",
        name: "Pro",
        desc: "Best for growing businesses",
        monthly: 299,
        yearly: 249, // effective per-month when billed yearly
        badge: "popular",
        trialTag: "14-day free trial",
        features: [
          { label: "Unlimited events", included: true },
          { label: "Up to 100 guests", included: true },
          { label: "Advanced AI agent", included: true },
          { label: "Payment processing", included: true },
        ],
      },
      {
        id: "team",
        name: "Team",
        desc: "For large organizations",
        monthly: 599,
        yearly: 499,
        features: [
          { label: "Unlimited events", included: true },
          { label: "Unlimited guests", included: true },
          { label: "Premium AI agent", included: true },
          { label: "Advanced payments", included: true },
        ],
      },
    ];
    return data;
  }
  if (path.startsWith("/promo/validate")) {
    const code = decodeURIComponent(path.split("code=")[1] || "");
    return { valid: code.toUpperCase() === "WELCOME50", message: code === "WELCOME50" ? "50% off first month" : "Invalid" };
  }
  if (path === "/subscribe") return { ok: true };
  return { ok: true };
}
