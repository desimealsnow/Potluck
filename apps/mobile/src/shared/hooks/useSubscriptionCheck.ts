import { useState, useEffect, useCallback } from 'react';
import { PaymentService } from '@/services/payment.service';
import { supabase } from '@/config/supabaseClient';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isLoading: boolean;
  error: string | null;
  subscription: any | null;
}

export function useSubscriptionCheck() {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isLoading: false, // Start as false, only load when user is authenticated
    error: null,
    subscription: null,
  });

  const checkSubscription = useCallback(async () => {
    try {
      // Check if user is authenticated first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('No authenticated user, skipping subscription check');
        setStatus({
          hasActiveSubscription: false,
          isLoading: false,
          error: null,
          subscription: null,
        });
        return;
      }

      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const paymentService = new PaymentService();
      const subscriptions = await paymentService.getSubscriptions();
      
      // Check for active subscription
      const activeSubscription = subscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );
      
      setStatus({
        hasActiveSubscription: !!activeSubscription,
        isLoading: false,
        error: null,
        subscription: activeSubscription || null,
      });
    } catch (error: any) {
      console.error('Subscription check failed:', error);
      setStatus({
        hasActiveSubscription: false,
        isLoading: false,
        error: error.message || 'Failed to check subscription',
        subscription: null,
      });
    }
  }, []);

  // Only check subscription when user is authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // User is authenticated, check subscription
          checkSubscription();
        } else {
          // User is not authenticated, reset status
          setStatus({
            hasActiveSubscription: false,
            isLoading: false,
            error: null,
            subscription: null,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  return {
    ...status,
    refetch: checkSubscription,
  };
}
