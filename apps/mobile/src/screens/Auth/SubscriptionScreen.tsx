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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

/* ---------------- Config (switch to your backend) ---------------- */
const API_BASE_URL = "https://YOUR_API_BASE_URL"; // set when live
const USE_MOCK = true; // set to false to call your API

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCK) return mockApi<T>(path, init);
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------------- Types ---------------- */
type PlanId = "free" | "pro" | "team";
type SubStatus = "active" | "trialing" | "canceled" | "none";

type SubscriptionDTO = {
  status: SubStatus;
  planId: PlanId;
  planName: string;
  price: number;           // 29.99
  interval: "month" | "year";
  renewsOn: string;        // ISO date
  paymentLast4?: string;   // "4242"
  billingEmail?: string;
};

type InvoiceDTO = {
  id: string;
  amount: number;     // 29.99
  status: "paid" | "open" | "void";
  date: string;       // ISO
  url?: string;       // pdf or hosted link
};

/* ---------------- Screen ---------------- */
export default function SubscriptionScreen({ onBack }: { onBack?: () => void }) {

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubscriptionDTO | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const gradient = useMemo(
    () => ["#EEDBFF", "#FFC6E2", "#C9F0FF"] as const, // soft, playful
    []
  );

  /** initial load */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [s, inv] = await Promise.all([
          api<SubscriptionDTO | null>("/billing/subscription"),
          api<InvoiceDTO[]>("/billing/invoices"),
        ]);
        setSub(s);
        setInvoices(inv);
      } catch (e) {
        console.warn(e);
        Alert.alert("Error", "Could not load subscription.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Actions */
  async function addOrUpgrade(planId?: PlanId) {
    // If you want to jump to your Plans screen, navigate with context
    // navigation.navigate("Plans", { from: "subscription" });
    try {
      const body = JSON.stringify({ planId: planId ?? "pro" }); // default upgrade to pro
      const next = await api<SubscriptionDTO>("/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      setSub(next);
      Alert.alert("Success", "Your plan has been updated.");
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Unable to update plan.");
    }
  }

  async function updatePayment() {
    try {
      const r: any = await api("/billing/payment-method", { method: "POST" });
      // If your backend returns a hosted link (e.g., Stripe), open it:
      if (r?.url) Linking.openURL(r.url);
      else Alert.alert("Payment method", "Update flow has started.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not start payment update.");
    }
  }

  async function cancelPlan() {
    Alert.alert("Cancel subscription?", "You can re-subscribe anytime.", [
      { text: "Keep Plan", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const next = await api<SubscriptionDTO>("/billing/subscription", { method: "DELETE" });
            setSub(next); // server may return status: "canceled" or null
            Alert.alert("Canceled", "Your plan has been canceled.");
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not cancel.");
          }
        },
      },
    ]);
  }

  const hasPlan = !!sub && sub.status !== "none";

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

        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          {/* Status banner */}
          {hasPlan ? (
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

          {/* If plan exists → show card; else → empty state */}
          {hasPlan ? (
            <>
              <View style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.planTitle}>
                    🍲 {sub?.planName} <Text style={{ fontSize: 12 }}>👑 🍽️</Text>
                  </Text>
                  <Ionicons name="sparkles" size={16} color="#E69A2E" />
                </View>

                <Text style={styles.price}>
                  ${sub?.price.toFixed(2)}/month <Text style={{ color: "#12A150" }}>• 🎉</Text>
                </Text>

                <View style={{ marginTop: 12, gap: 8 }}>
                  <Row label="Renews on" value={date(sub!.renewsOn)} />
                  <Row
                    label="Payment method"
                    value={sub?.paymentLast4 ? `•••• ${sub.paymentLast4}` : "—"}
                    icon="card"
                  />
                  <Row label="Billing email" value={sub?.billingEmail ?? "—"} />
                </View>
              </View>

              <Pressable style={styles.bigGradientBtn} onPress={() => addOrUpgrade()}>
                <LinearGradient
                  colors={["#FF4AA2", "#6A83FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bigGradientInner}
                >
                  <Text style={styles.bigGradientText}>🎉 Upgrade My Potluck Plan!</Text>
                </LinearGradient>
              </Pressable>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={updatePayment}>
                  <Ionicons name="card" size={16} color="#166F4D" />
                  <Text style={[styles.secondaryBtnText, { color: "#166F4D" }]}>Update Payment</Text>
                </Pressable>
                <Pressable style={[styles.secondaryBtn, { flex: 1, backgroundColor: "#FFE6DC", borderColor: "#FFD0BD" }]} onPress={cancelPlan}>
                  <Ionicons name="close" size={16} color="#AA3A2A" />
                  <Text style={[styles.secondaryBtnText, { color: "#AA3A2A" }]}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Subscription Yet</Text>
              <Text style={styles.emptyText}>Enjoy premium features like unlimited events, smarter AI, and more.</Text>
              <Pressable onPress={() => addOrUpgrade("pro")} style={styles.bigCta}>
                <Text style={styles.bigCtaText}>Add Plan</Text>
              </Pressable>
            </View>
          )}

          {/* Invoices */}
          {invoices.length > 0 && (
            <Text style={styles.invoicesHeader}>Invoices</Text>
          )}
          {invoices.map((inv) => (
            <View key={inv.id} style={styles.invoiceRow}>
              <View>
                <Text style={styles.invDate}>{date(inv.date)}</Text>
                <Text style={styles.invAmount}>${inv.amount.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pill text={inv.status} tone={inv.status === "paid" ? "green" : "amber"} />
                <Pressable
                  style={styles.iconOnly}
                  onPress={() => (inv.url ? Linking.openURL(inv.url) : undefined)}
                >
                  <Ionicons name="download" size={16} color="#1a1a1a" />
                </Pressable>
              </View>
            </View>
          ))}
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

/* ---------------- Mock backend (delete when wired) ---------------- */
async function mockApi<T>(path: string, init?: RequestInit): Promise<any> {
  await new Promise((r) => setTimeout(r, 220));
  // GET subscription
  if (path === "/billing/subscription" && !init) {
    // Toggle between returning null (no plan) or an active plan for testing
    const hasPlan = true;
    if (!hasPlan) return null;
    return {
      status: "active",
      planId: "pro",
      planName: "Potluck Pro Plan",
      price: 29.99,
      interval: "month",
      renewsOn: new Date("2025-01-15").toISOString(),
      paymentLast4: "4242",
      billingEmail: "potluck@foodie.com",
    } as SubscriptionDTO;
  }
  // LIST invoices
  if (path === "/billing/invoices") {
    return [
      { id: "inv_dec", amount: 29.99, status: "paid", date: "2024-12-01", url: "https://example.com/dec.pdf" },
      { id: "inv_nov", amount: 29.99, status: "paid", date: "2024-11-01", url: "https://example.com/nov.pdf" },
      { id: "inv_oct", amount: 29.99, status: "paid", date: "2024-10-01", url: "https://example.com/oct.pdf" },
    ] as InvoiceDTO[];
  }
  // ADD / UPGRADE
  if (path === "/billing/subscribe" && init?.method === "POST") {
    const body = JSON.parse(String(init.body || "{}"));
    const planId: PlanId = body.planId ?? "pro";
    const map = { pro: 29.99, team: 59.99, free: 0 };
    return {
      status: planId === "free" ? "active" : "active",
      planId,
      planName: planId === "team" ? "Potluck Team Plan" : planId === "pro" ? "Potluck Pro Plan" : "Free",
      price: map[planId],
      interval: "month",
      renewsOn: new Date(Date.now() + 30 * 86400e3).toISOString(),
      paymentLast4: planId === "free" ? undefined : "4242",
      billingEmail: "potluck@foodie.com",
    } as SubscriptionDTO;
  }
  // UPDATE PAYMENT
  if (path === "/billing/payment-method" && init?.method === "POST") {
    return { url: "https://billing.example.com/update" };
  }
  // CANCEL
  if (path === "/billing/subscription" && init?.method === "DELETE") {
    return { status: "none" } as SubscriptionDTO;
  }
  return { ok: true };
}
