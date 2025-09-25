import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components";
import Header from "@/components/Header";
import { paymentService, type Subscription, type Invoice, type BillingPlan } from "@/services/payment.service";

export default function SubscriptionScreen({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);

  const currentSubscription = subscriptions.find(sub => sub.status === 'active' || sub.status === 'trialing');

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [subs, inv, plansData] = await Promise.all([
        paymentService.getSubscriptions(),
        paymentService.getInvoices(),
        paymentService.getPlans(),
      ]);
      setSubscriptions(subs); setInvoices(inv); setPlans(plansData);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load subscription data");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  async function startPayment(plan: BillingPlan) { try { await paymentService.startPayment(plan.id, 'lemonsqueezy'); setTimeout(() => loadData(), 2000); } catch (e: any) { Alert.alert("Payment Error", e?.message ?? "Failed to start payment process."); } }
  async function updatePayment() { try { await paymentService.updatePaymentMethod(); } catch (e: any) { Alert.alert("Error", e?.message ?? "Could not start payment update."); } }
  async function cancelSubscription() { if (!currentSubscription) return; try { await paymentService.cancelSubscription(currentSubscription.id); Alert.alert("Canceled", "Your subscription has been canceled."); loadData(); } catch (e: any) { Alert.alert("Error", e?.message ?? "Could not cancel subscription."); } }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#351657' }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#7b2ff7" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 10 }}>Loading subscription...</Text>
        </SafeAreaView>
      </View>
    );
  }

  const hasActivePlan = !!currentSubscription;
  return (
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header onNotifications={() => {}} onSettings={() => {}} onPlans={() => {}} onLogout={() => {}} unreadCount={0} showNavigation={false} />
        <View style={[styles.topBar, { backgroundColor: '#351657' }]}>
          <Pressable onPress={onBack} style={styles.iconBtn}><Icon name="ChevronLeft" size={18} color="#2a2a2a" /></Pressable>
          <Text style={styles.topTitle}>My Potluck Subscription</Text>
          <View style={{ width: 36, height: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#fff" /> }>
          {hasActivePlan ? (
            <View style={styles.bannerGreen}><Icon name="CircleCheck" size={18} color="#0B5E3B" /><Text style={styles.bannerGreenText}>🎉 Your potluck subscription is <Text style={{ fontWeight: '900' }}>active</Text>!</Text></View>
          ) : (
            <View style={styles.bannerNeutral}><Icon name="Info" size={18} color="#6B7280" /><Text style={styles.bannerNeutralText}>No active plan. Pick a plan to get started.</Text></View>
          )}

          {hasActivePlan && currentSubscription ? (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.planTitle}>🍲 {paymentService.getPlanDisplayName(currentSubscription.plan_id)}</Text>
                <Icon name="Sparkles" size={16} color="#E69A2E" />
              </View>
              <View style={{ marginTop: 12, gap: 8 }}>
                <Row label="Status" value={paymentService.formatStatus(currentSubscription.status).text} />
                <Row label="Renews on" value={currentSubscription.current_period_end ? new Date(currentSubscription.current_period_end).toLocaleDateString() : '—'} />
                <Row label="Provider" value={currentSubscription.provider} />
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Subscription Yet</Text>
              <Text style={styles.emptyText}>Choose a plan to enjoy premium features like unlimited events, smarter AI, and more.</Text>
              {plans.length > 0 ? (
                <View style={{ marginTop: 20, gap: 12 }}>
                  {plans.map((plan) => (
                    <Pressable key={plan.id} onPress={() => startPayment(plan)} style={[styles.planCard, plan.id === '992413' && styles.recommendedPlan]}>
                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        {plan.id === '992413' && (<View style={styles.recommendedBadge}><Text style={styles.recommendedText}>RECOMMENDED</Text></View>)}
                      </View>
                      <Text style={styles.planPrice}>{paymentService.formatAmount(plan.amount_cents, plan.currency)}/{plan.interval}</Text>
                      <Text style={styles.planDescription}>{plan.interval === 'month' ? 'Monthly billing' : 'Yearly billing'} • Cancel anytime</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Pressable onPress={() => loadData()} style={styles.bigCta}><Text style={styles.bigCtaText}>Load Plans</Text></Pressable>
              )}
            </View>
          )}

          {hasActivePlan && currentSubscription && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={updatePayment}><Icon name="CreditCard" size={16} color="#166F4D" /><Text style={[styles.secondaryBtnText, { color: "#166F4D" }]}>Update Payment</Text></Pressable>
              <Pressable style={[styles.secondaryBtn, { flex: 1, backgroundColor: "#FFE6DC", borderColor: "#FFD0BD" }]} onPress={cancelSubscription}><Icon name="X" size={16} color="#AA3A2A" /><Text style={[styles.secondaryBtnText, { color: "#AA3A2A" }]}>Cancel</Text></Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) { return (<View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>); }

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { fontWeight: "900", color: "#8A36C1" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)" },
  bannerGreen: { borderRadius: 14, padding: 12, backgroundColor: "#CFF9E5", borderWidth: 1, borderColor: "#A3EED1", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  bannerGreenText: { color: "#0B5E3B", fontWeight: "800" },
  bannerNeutral: { borderRadius: 14, padding: 12, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  bannerNeutralText: { color: "#4B5563", fontWeight: "700" },
  card: { borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", marginBottom: 12, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 2 } }), },
  planTitle: { fontWeight: "900", color: "#D24A63" },
  secondaryBtn: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#CBEFDA", backgroundColor: "#E7FBF0", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  secondaryBtnText: { fontWeight: "900" },
  empty: { borderRadius: 18, padding: 16, alignItems: "center", backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", marginBottom: 12 },
  emptyTitle: { fontWeight: "900", color: "#6C2BD2" },
  emptyText: { textAlign: "center", marginTop: 6, color: "#6B7280" },
  bigCta: { marginTop: 10, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0B16", paddingHorizontal: 16 },
  bigCtaText: { color: "#fff", fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { color: "#6B7280", fontWeight: "800" },
  rowValue: { color: "#111", fontWeight: "800" },
  planCard: { borderRadius: 16, padding: 16, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 1 } }), },
  recommendedPlan: { borderColor: "#8A36C1", borderWidth: 2, backgroundColor: "rgba(138,54,193,0.05)" },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  planName: { fontSize: 18, fontWeight: "900", color: "#111" },
  recommendedBadge: { backgroundColor: "#8A36C1", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  recommendedText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  planPrice: { fontSize: 24, fontWeight: "900", color: "#8A36C1", marginBottom: 4 },
  planDescription: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
});
