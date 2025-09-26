import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/ui/Icon';
import { PaymentStatusBadge } from '@/payments/components/PaymentStatusBadge';
import type { Invoice } from '@/services/payment.service';
import { styles } from '../styles/InvoiceCardStyles';

export interface InvoiceCardProps {
  invoice: Invoice;
  onDownload?: () => void;
}

export function InvoiceCard({ invoice, onDownload }: InvoiceCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amountCents: number, currency: string) => {
    const amount = amountCents / 100;
    const currencySymbol = currency === 'usd' ? '$' : currency === 'inr' ? '₹' : currency.toUpperCase();
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'open':
        return '#F59E0B';
      case 'void':
        return '#6B7280';
      case 'uncollectible':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'open':
        return 'Open';
      case 'void':
        return 'Void';
      case 'uncollectible':
        return 'Uncollectible';
      default:
        return status;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceDate}>{formatDate(invoice.invoice_date)}</Text>
          <Text style={styles.invoiceAmount}>
            {formatAmount(invoice.amount_cents, invoice.currency)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <PaymentStatusBadge
            status={invoice.status as any}
            size="sm"
          />
          {onDownload && (
            <Pressable
              style={styles.downloadButton}
              onPress={onDownload}
            >
              <Icon name="Download" size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>
      
      {invoice.paid_date && (
        <Text style={styles.paidDate}>
          Paid on {formatDate(invoice.paid_date)}
        </Text>
      )}
    </View>
  );
}

