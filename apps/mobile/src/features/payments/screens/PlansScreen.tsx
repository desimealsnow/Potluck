import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/ui";
import Header from "@/layout/Header";
import { supabase } from "@/config/supabaseClient";
import { paymentService, type BillingPlan, type Subscription } from "@/services/payment.service";
import { PlanCard as PaymentPlanCard } from "@/payments/components/PlanCard";
import { styles } from "../styles/PlansScreenStyles";

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
      
      console.log('📋 Plans loaded:', plansData);
      console.log('📋 Subscriptions loaded:', subsData);
      
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
    
    console.log('🔍 Plan selected:', {
      id: plan.id,
      name: plan.name,
      price_id: plan.price_id,
      provider: plan.provider
    });
    
    try {
      // Now plan.id IS the LemonSqueezy variant ID (fetched from their API)
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
            <Icon name="ChevronLeft" size={18} color="#1e1e1e" />
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
    </View>
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
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} color="#111" />
      </Pressable>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </View>
  );
}

