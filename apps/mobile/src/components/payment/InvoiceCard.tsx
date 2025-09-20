import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { Invoice } from '../../services/payment.service';

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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});
