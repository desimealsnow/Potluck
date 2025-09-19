import { useState, useEffect, useCallback } from 'react';
import { PaymentService } from '../services/payment.service';
import { supabase } from '../config/supabaseClient';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isLoading: boolean;
  error: string | null;
  subscription: any | null;
}

/**
 * Manages the subscription status of a user by checking their active subscriptions.
 *
 * The function initializes the subscription status and sets up an effect to check the user's subscription
 * whenever their authentication state changes. It retrieves the user's session, checks for active subscriptions,
 * and updates the status accordingly. In case of an error during the subscription check, it logs the error and
 * updates the status to reflect the failure.
 *
 * @returns An object containing the subscription status, loading state, error message, and a refetch function.
 */
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
