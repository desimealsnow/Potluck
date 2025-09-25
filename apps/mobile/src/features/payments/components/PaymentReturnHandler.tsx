import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { webPaymentUtils } from '@/services/payment.service';

/**
 * Component to handle returning from payment on web
 * Add this to your main app component or layout
 */
export function PaymentReturnHandler() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if we're returning from a payment
      webPaymentUtils.handlePaymentReturn();
    }
  }, []);

  // This component doesn't render anything
  return null;
}

export default PaymentReturnHandler;
