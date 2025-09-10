import { apiClient } from './apiClient';
import { Linking, Alert } from 'react-native';

export interface BillingPlan {
  id: string;
  price_id: string;
  provider: string;
  name: string;
  amount_cents: number;
  currency: string;
  interval: 'month' | 'year';
  is_active: boolean;
  created_at?: string;
}

export interface Subscription {
  id: string;
  plan_id: string;
  provider_subscription_id: string;
  provider: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired';
  current_period_start?: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  cancel_at_period_end?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  subscription_id?: string;
  user_id: string;
  invoice_id?: string;
  provider: string;
  amount_cents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  invoice_date: string;
  paid_date?: string;
  created_at?: string;
}

export interface CheckoutSession {
  checkout_url: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  provider: string;
  method_id: string;
  is_default: boolean;
  brand?: string;
  last_four?: string;
  exp_month?: number;
  exp_year?: number;
  created_at?: string;
}

export class PaymentService {
  /**
   * Get available billing plans
   */
  async getPlans(): Promise<BillingPlan[]> {
    try {
      const response = await apiClient.get<BillingPlan[]>('/billing/plans');
      return response;
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      throw error;
    }
  }

  /**
   * Get user's subscriptions
   */
  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await apiClient.get<Subscription[]>('/billing/subscriptions');
      return response;
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get user's invoices
   */
  async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await apiClient.get<Invoice[]>('/billing/invoices');
      return response;
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      throw error;
    }
  }

  /**
   * Create checkout session for a plan
   */
  async createCheckoutSession(planId: string, provider: string = 'lemonsqueezy'): Promise<CheckoutSession> {
    try {
      const response = await apiClient.post<CheckoutSession>('/billing/checkout/subscription', {
        plan_id: planId,
        provider: provider,
      });
      return response;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Start payment flow by opening hosted checkout
   */
  async startPayment(planId: string, provider: string = 'lemonsqueezy'): Promise<void> {
    try {
      const checkout = await this.createCheckoutSession(planId, provider);
      
      // Open the checkout URL in the device's browser
      const supported = await Linking.canOpenURL(checkout.checkout_url);
      
      if (supported) {
        await Linking.openURL(checkout.checkout_url);
      } else {
        Alert.alert(
          'Error',
          'Cannot open payment page. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Payment flow failed:', error);
      Alert.alert(
        'Payment Error',
        'Failed to start payment process. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await apiClient.delete<Subscription>(`/billing/subscriptions/${subscriptionId}`);
      return response;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate a subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await apiClient.post<Subscription>(`/billing/subscriptions/${subscriptionId}/reactivate`);
      return response;
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get<PaymentMethod[]>('/billing/payment-methods');
      return response;
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      throw error;
    }
  }

  /**
   * Update payment method (opens hosted page)
   */
  async updatePaymentMethod(): Promise<void> {
    try {
      // This would typically return a URL to update payment method
      const response = await apiClient.post<{ url: string }>('/billing/payment-method');
      
      if (response.url) {
        const supported = await Linking.canOpenURL(response.url);
        if (supported) {
          await Linking.openURL(response.url);
        } else {
          Alert.alert('Error', 'Cannot open payment update page.');
        }
      }
    } catch (error) {
      console.error('Failed to update payment method:', error);
      Alert.alert('Error', 'Failed to update payment method. Please try again.');
    }
  }

  /**
   * Download invoice
   */
  async downloadInvoice(invoiceId: string): Promise<void> {
    try {
      // This would typically return a PDF URL or blob
      const response = await apiClient.get<{ url: string }>(`/billing/invoices/${invoiceId}/download`);
      
      if (response.url) {
        const supported = await Linking.canOpenURL(response.url);
        if (supported) {
          await Linking.openURL(response.url);
        } else {
          Alert.alert('Error', 'Cannot open invoice.');
        }
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
      Alert.alert('Error', 'Failed to download invoice. Please try again.');
    }
  }

  /**
   * Format currency amount
   */
  formatAmount(amountCents: number, currency: string = 'usd'): string {
    const amount = amountCents / 100;
    const currencySymbol = currency === 'usd' ? '$' : currency === 'inr' ? '₹' : currency.toUpperCase();
    return `${currencySymbol}${amount.toFixed(2)}`;
  }

  /**
   * Format subscription status for display
   */
  formatStatus(status: string): { text: string; color: string } {
    switch (status) {
      case 'active':
        return { text: 'Active', color: '#10B981' };
      case 'trialing':
        return { text: 'Trial', color: '#3B82F6' };
      case 'past_due':
        return { text: 'Past Due', color: '#F59E0B' };
      case 'canceled':
        return { text: 'Canceled', color: '#EF4444' };
      case 'incomplete':
        return { text: 'Incomplete', color: '#6B7280' };
      case 'incomplete_expired':
        return { text: 'Expired', color: '#6B7280' };
      default:
        return { text: status, color: '#6B7280' };
    }
  }

  /**
   * Get plan display name with emoji
   */
  getPlanDisplayName(planName: string): string {
    const name = planName.toLowerCase();
    if (name.includes('free')) return '🆓 Free';
    if (name.includes('pro')) return '⭐ Pro';
    if (name.includes('team')) return '👥 Team';
    if (name.includes('premium')) return '💎 Premium';
    return `📦 ${planName}`;
  }

  /**
   * Get plan features based on plan name
   */
  getPlanFeatures(planName: string): Array<{ label: string; included: boolean }> {
    const name = planName.toLowerCase();
    
    if (name.includes('free')) {
      return [
        { label: 'Up to 3 events per month', included: true },
        { label: 'Basic participant management', included: true },
        { label: 'Email notifications', included: true },
        { label: 'Advanced analytics', included: false },
        { label: 'Custom branding', included: false },
        { label: 'Priority support', included: false },
      ];
    }
    
    if (name.includes('pro')) {
      return [
        { label: 'Unlimited events', included: true },
        { label: 'Advanced participant management', included: true },
        { label: 'Email & SMS notifications', included: true },
        { label: 'Advanced analytics', included: true },
        { label: 'Custom branding', included: true },
        { label: 'Priority support', included: true },
      ];
    }
    
    if (name.includes('team')) {
      return [
        { label: 'Unlimited events', included: true },
        { label: 'Unlimited participants', included: true },
        { label: 'Team collaboration tools', included: true },
        { label: 'Advanced analytics', included: true },
        { label: 'White-label branding', included: true },
        { label: 'Dedicated support', included: true },
      ];
    }
    
    // Default features
    return [
      { label: 'Basic features', included: true },
      { label: 'Email support', included: true },
    ];
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
