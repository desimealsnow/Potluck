import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/ui";
import Header from "@/layout/Header";
import { paymentService, type Subscription, type Invoice, type BillingPlan } from "@/services/payment.service";
import { PlanCard, InvoiceCard } from "@/payments/components";
import * as WebBrowser from 'expo-web-browser';
import { styles } from "../styles/SubscriptionScreenStyles";

/* ---------------- Types ---------------- */
type PlanId = "free" | "pro" | "team";

/* ---------------- Screen ---------------- */
export default function SubscriptionScreen({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
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

      const [subs, inv, plansData] = await Promise.all([
        paymentService.getSubscriptions(),
        paymentService.getInvoices(),
        paymentService.getPlans(),
      ]);
      
      setSubscriptions(subs);
      setInvoices(inv);
      setPlans(plansData);
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

  // Web overlay: dynamically load lemon.js and wire success handler to close overlay and refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isWeb = Platform.OS === 'web';
    if (!isWeb) return;

    // helper to mirror logs to server terminal
    const sendLog = async (message: string, context?: unknown) => {
      try {
        await fetch('http://localhost:3000/api/v1/dev-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'info', message, context })
        });
      } catch {}
    };

    const w: any = window as any;
    const ensureSetup = () => {
      if (!w.LemonSqueezy?.Setup) return false;
      if (w.__ls_setup_done) return true;
      try {
        w.LemonSqueezy.Setup({
          eventHandler: (ev: any) => {
            console.log('[lemon] event', ev?.event, ev);
            sendLog('lemon.event', { event: ev?.event, data: ev?.data });
            if (ev?.event === 'Checkout.Success') {
              try { w.LemonSqueezy.Url?.Close?.(); } catch {}
              setTimeout(() => { loadData(true); }, 1000);
            }
            if (ev?.event === 'Checkout.Close') {
              sendLog('lemon.close');
            }
          }
        });
        w.__ls_setup_done = true;
        sendLog('lemon.setup');
        return true;
      } catch {
        return false;
      }
    };

    // if script already present, setup now
    if (ensureSetup()) return;

    // inject script once
    if (!document.getElementById('lemon-js')) {
      const script = document.createElement('script');
      script.id = 'lemon-js';
      script.src = 'https://cdn.lemonsqueezy.com/lemon.js';
      script.defer = true;
      script.onload = () => {
        sendLog('lemon.loaded');
        ensureSetup();
      };
      document.head.appendChild(script);
      sendLog('lemon.inject');
    } else {
      // script exists; retry setup shortly
      setTimeout(() => ensureSetup(), 500);
    }

    return () => {
      // no teardown needed; overlay library manages its own listeners
    };
  }, []);

  

  /** Actions */
  async function startPayment(plan: BillingPlan) {
    try {
      console.log('🔍 Starting payment for plan:', {
        id: plan.id,
        name: plan.name,
        price_id: plan.price_id
      });
      await paymentService.startPayment(plan.id, 'lemonsqueezy');
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
    <View style={{ flex: 1, backgroundColor: '#351657' }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7b2ff7" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 10 }}>
          Loading subscription...
        </Text>
      </SafeAreaView>
    </View>
  );
  }

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
            <Icon name="ChevronLeft" size={18} color="#2a2a2a" />
          </Pressable>
          <Text style={styles.topTitle}>My Potluck Subscription</Text>
          <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Icon name="Moon" size={16} color="#9B7C4D" />
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
              <Icon name="CircleCheck" size={18} color="#0B5E3B" />
              <Text style={styles.bannerGreenText}>
                🎉 Your potluck subscription is <Text style={{ fontWeight: "900" }}>active</Text>!
              </Text>
            </View>
          ) : (
            <View style={styles.bannerNeutral}>
              <Icon name="Info" size={18} color="#6B7280" />
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
                <Icon name="Sparkles" size={16} color="#E69A2E" />
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
              <Text style={styles.emptyText}>Choose a plan to enjoy premium features like unlimited events, smarter AI, and more.</Text>
              
              {/* Display all available plans */}
              {plans.length > 0 ? (
                <View style={{ marginTop: 20, gap: 12 }}>
                  {plans.map((plan) => (
                    <Pressable 
                      key={plan.id} 
                      onPress={() => startPayment(plan)} 
                      style={[styles.planCard, plan.id === '992413' && styles.recommendedPlan]}
                    >
                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        {plan.id === '992413' && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planPrice}>
                        {paymentService.formatAmount(plan.amount_cents, plan.currency)}/{plan.interval}
                      </Text>
                      <Text style={styles.planDescription}>
                        {plan.interval === 'month' ? 'Monthly billing' : 'Yearly billing'} • Cancel anytime
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Pressable onPress={() => loadData()} style={styles.bigCta}>
                  <Text style={styles.bigCtaText}>Load Plans</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Action buttons for active subscription */}
          {hasActivePlan && currentSubscription && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={updatePayment}>
                <Icon name="CreditCard" size={16} color="#166F4D" />
                <Text style={[styles.secondaryBtnText, { color: "#166F4D" }]}>Update Payment</Text>
              </Pressable>
              <Pressable 
                style={[styles.secondaryBtn, { flex: 1, backgroundColor: "#FFE6DC", borderColor: "#FFD0BD" }]} 
                onPress={cancelSubscription}
              >
                <Icon name="X" size={16} color="#AA3A2A" />
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
    </View>
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
  icon?: import("@/ui/Icon").IconName;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {icon ? <Icon name={icon} size={14} color="#6B7280" /> : null}
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

