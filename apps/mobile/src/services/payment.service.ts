import { apiClient } from './apiClient';
import { Linking, Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Web-specific window declaration
declare const window: any;

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
      console.log('🔍 Fetching subscriptions...');
      const response = await apiClient.get<Subscription[]>('/billing/subscriptions');
      console.log('✅ Subscriptions fetched successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch subscriptions:', error);
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
      // For web AuthSession auto-close, ensure server uses the same return URL
      const returnUrl = (Platform.OS !== 'web')
        ? AuthSession.makeRedirectUri({ preferLocalhost: true, path: '/' })
        : undefined;
      if (returnUrl) {
        console.log('🔁 Using AuthSession returnUrl:', returnUrl);
      }
      const response = await apiClient.post<CheckoutSession>('/billing/checkout/subscription', {
        plan_id: planId,
        provider,
        ...(returnUrl ? { return_url: returnUrl } : {}),
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
    let checkout: CheckoutSession | undefined;
    
    try {
      checkout = await this.createCheckoutSession(planId, provider);
      
      console.log('🔗 Opening checkout URL:', checkout.checkout_url);
      console.log('📱 Platform:', Platform.OS);
      // Mirror critical logs to server so they appear in `npm run dev:server` terminal
      const sendLog = async (level: 'info'|'warn'|'error', message: string, context?: unknown) => {
        try {
          await fetch('http://localhost:3000/api/v1/dev-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level, message, context })
          });
        } catch {}
      };
      await sendLog('info', 'payment.open', { url: checkout.checkout_url, platform: Platform.OS });
      
      // Configure WebBrowser options based on platform
      const browserOptions: WebBrowser.WebBrowserOpenOptions = {
        // Show title
        showTitle: true,
        // Enable controls for better UX
        controlsColor: '#007AFF',
        // Show in recents
        showInRecents: true,
      };

      // Platform-specific handling
      if (Platform.OS === 'web') {
        // Web preferred: LemonSqueezy overlay if lemon.js is loaded
        const ensureLemonReady = async () => {
          if (typeof window === 'undefined') return false;
          const w: any = window as any;
          if (w.LemonSqueezy?.Url?.Open) return true;
          // inject script if missing
          if (!document.getElementById('lemon-js')) {
            const s = document.createElement('script');
            s.id = 'lemon-js';
            s.src = 'https://cdn.lemonsqueezy.com/lemon.js';
            s.defer = true;
            document.head.appendChild(s);
          }
          // wait up to 3s for availability
          const start = Date.now();
          while (Date.now() - start < 3000) {
            if (w.LemonSqueezy?.Url?.Open) return true;
            await new Promise(r => setTimeout(r, 100));
          }
          return !!w.LemonSqueezy?.Url?.Open;
        };
        try {
          const ready = await ensureLemonReady();
          if (ready && typeof window !== 'undefined' && (window as any).LemonSqueezy?.Url?.Open) {
            console.log('🌐 Opening payment via LemonSqueezy overlay');
            await sendLog('info', 'payment.web.overlay.open', { url: checkout.checkout_url });
            (window as any).LemonSqueezy.Url.Open(checkout.checkout_url);
            return;
          }
        } catch {}

        // Fallback: force real new tab via window.open to avoid in-app modal behavior
        try {
          console.log('🌐 Opening payment in new tab');
          await sendLog('info', 'payment.web.window.open', { url: checkout.checkout_url });
          const newWin = window.open(checkout.checkout_url, '_blank', 'noopener,noreferrer');
          // Poll for subscription state for up to 60s while user completes flow
          const start = Date.now();
          const poll = async () => {
            try {
              const subs = await this.getSubscriptions();
              const active = subs?.some(s => s.status === 'active' || s.status === 'trialing');
              if (active) {
                console.log('✅ Subscription detected active during polling');
                await sendLog('info', 'payment.web.poll.active');
                return; // stop polling
              }
              // No local seeding; rely on webhooks
            } catch {}
            if (Date.now() - start < 60000) setTimeout(poll, 5000);
          };
          setTimeout(poll, 5000);
          // Optionally close the new tab if allowed (usually blocked); ignore errors
          setTimeout(() => { try { newWin?.close?.(); } catch {} }, 70000);
        } catch (e) {
          console.warn('⚠️ window.open failed, falling back to Expo WebBrowser');
          await sendLog('warn', 'payment.web.window.open.failed');
          const result = await WebBrowser.openBrowserAsync(checkout.checkout_url, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
            showTitle: true,
            controlsColor: '#007AFF',
            toolbarColor: '#FFFFFF',
            secondaryToolbarColor: '#F8F8F8',
          });
          console.log('🔗 WebBrowser result:', result);
          await sendLog('info', 'payment.web.browser.result', result as any);
        }
        return;
      }

      // Mobile platforms: Use WebBrowser with platform-specific configurations
      if (Platform.OS === 'ios') {
        // iOS: Use modal presentation for better in-app experience
        browserOptions.presentationStyle = WebBrowser.WebBrowserPresentationStyle.FORM_SHEET;
        browserOptions.toolbarColor = '#FFFFFF';
        browserOptions.secondaryToolbarColor = '#F8F8F8';
      } else if (Platform.OS === 'android') {
        // Android: Use full screen for better experience
        browserOptions.presentationStyle = WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN;
        browserOptions.toolbarColor = '#FFFFFF';
        browserOptions.secondaryToolbarColor = '#F8F8F8';
      }

      // Open the checkout URL using Expo WebBrowser
      const result = await WebBrowser.openBrowserAsync(checkout.checkout_url, browserOptions);
      
      console.log('🔗 WebBrowser result:', result);
      
      // Handle the result based on type
      switch (result.type) {
        case 'cancel':
          console.log('User cancelled the payment flow');
          break;
        case 'dismiss':
          console.log('Payment flow was dismissed');
          break;
        case 'opened':
          console.log('Payment flow opened successfully');
          break;
        default:
          console.log('Payment flow completed with result:', result.type);
      }
      
    } catch (error) {
      console.error('Payment flow failed:', error);
      
      // Fallback to Linking if WebBrowser fails
      try {
        console.log('🔄 Falling back to Linking...');
        if (!checkout) {
          checkout = await this.createCheckoutSession(planId, provider);
        }
        
        const supported = await Linking.canOpenURL(checkout.checkout_url);
        
        if (supported) {
          await Linking.openURL(checkout.checkout_url);
        } else {
          throw new Error('Cannot open payment URL');
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        Alert.alert(
          'Payment Error',
          'Failed to start payment process. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      }
    }
  }

  /**
   * Seed subscription data for local testing (simulates webhook delivery)
   */
  // Local seeding removed; relying on webhooks only

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
        console.log('🔗 Opening payment method update URL:', response.url);
        console.log('📱 Platform:', Platform.OS);
        
        // Platform-specific handling
        if (Platform.OS === 'web') {
          // Web: Use AuthSession for in-app browser experience
          console.log('🌐 Opening payment method update in in-app browser');
          console.log('🔗 Update URL:', response.url);
          
          try {
            const result = await WebBrowser.openAuthSessionAsync(
              response.url,
              `${window.location.origin}/success?action=update`
            );
            console.log('🔗 Payment method update result:', result);
            
            if (result.type === 'success') {
              Alert.alert('Success', 'Payment method updated successfully!');
            } else if (result.type === 'cancel') {
              Alert.alert('Cancelled', 'Payment method update was cancelled');
            }
          } catch (error) {
            console.error('❌ AuthSession failed:', error);
            // Fallback to regular WebBrowser
            const result = await WebBrowser.openBrowserAsync(response.url, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
              showTitle: true,
              controlsColor: '#007AFF',
              toolbarColor: '#FFFFFF',
              secondaryToolbarColor: '#F8F8F8',
            });
            console.log('🔗 Fallback result:', result);
          }
          return;
        }

        // Mobile platforms: Use WebBrowser
        const browserOptions: WebBrowser.WebBrowserOpenOptions = {
          showTitle: true,
          controlsColor: '#007AFF',
          showInRecents: true,
        };

        if (Platform.OS === 'ios') {
          browserOptions.presentationStyle = WebBrowser.WebBrowserPresentationStyle.FORM_SHEET;
          browserOptions.toolbarColor = '#FFFFFF';
          browserOptions.secondaryToolbarColor = '#F8F8F8';
        } else if (Platform.OS === 'android') {
          browserOptions.presentationStyle = WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN;
          browserOptions.toolbarColor = '#FFFFFF';
          browserOptions.secondaryToolbarColor = '#F8F8F8';
        }

        const result = await WebBrowser.openBrowserAsync(response.url, browserOptions);
        console.log('🔗 Payment method update result:', result);
        
      } else {
        Alert.alert('Error', 'No payment update URL received from server.');
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
        console.log('🔗 Opening invoice URL:', response.url);
        console.log('📱 Platform:', Platform.OS);
        
        // Platform-specific handling
        if (Platform.OS === 'web') {
          // Web: Use AuthSession for in-app browser experience
          console.log('🌐 Opening invoice in in-app browser');
          console.log('🔗 Invoice URL:', response.url);
          
          try {
            const result = await WebBrowser.openAuthSessionAsync(
              response.url,
              `${window.location.origin}/success`
            );
            console.log('🔗 Invoice result:', result);
          } catch (error) {
            console.error('❌ AuthSession failed:', error);
            // Fallback to regular WebBrowser
            const result = await WebBrowser.openBrowserAsync(response.url, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
              showTitle: true,
              controlsColor: '#007AFF',
              toolbarColor: '#FFFFFF',
              secondaryToolbarColor: '#F8F8F8',
            });
            console.log('🔗 Fallback result:', result);
          }
          return;
        }

        // Mobile platforms: Use WebBrowser
        const browserOptions: WebBrowser.WebBrowserOpenOptions = {
          showTitle: true,
          controlsColor: '#007AFF',
          showInRecents: true,
        };

        if (Platform.OS === 'ios') {
          browserOptions.presentationStyle = WebBrowser.WebBrowserPresentationStyle.FORM_SHEET;
          browserOptions.toolbarColor = '#FFFFFF';
          browserOptions.secondaryToolbarColor = '#F8F8F8';
        } else if (Platform.OS === 'android') {
          browserOptions.presentationStyle = WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN;
          browserOptions.toolbarColor = '#FFFFFF';
          browserOptions.secondaryToolbarColor = '#F8F8F8';
        }

        const result = await WebBrowser.openBrowserAsync(response.url, browserOptions);
        console.log('🔗 Invoice download result:', result);
        
      } else {
        Alert.alert('Error', 'No invoice URL received from server.');
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

// Web-specific utility functions
export const webPaymentUtils = {
  /**
   * Check if we're returning from a payment and redirect back to the app
   */
  handlePaymentReturn(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const returnUrl = localStorage.getItem('paymentReturnUrl');
      if (returnUrl && returnUrl !== window.location.href) {
        console.log('🔄 Returning from payment, redirecting to:', returnUrl);
        localStorage.removeItem('paymentReturnUrl');
        window.location.href = returnUrl;
      }
    }
  },

  /**
   * Clear any stored return URL
   */
  clearReturnUrl(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.removeItem('paymentReturnUrl');
    }
  }
};
