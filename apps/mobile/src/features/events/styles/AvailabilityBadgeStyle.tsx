import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 2,
  },
  loading: {
    backgroundColor: '#f0f0f0',
  },
  available: {
    backgroundColor: '#e6f7e6',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  filling: {
    backgroundColor: '#fff3e0',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  almostFull: {
    backgroundColor: '#ffeaa7',
    borderColor: '#fdcb6e',
    borderWidth: 1,
  },
  full: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  availabilityText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
  },
  details: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
});
