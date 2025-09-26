import { StyleSheet, Platform } from 'react-native';
import { View, Text, Pressable, TextInput, ScrollView, Alert, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth < 400 ? 16 : 20,
    paddingVertical: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: screenWidth < 400 ? 18 : 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: screenWidth < 400 ? 12 : 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: screenWidth < 400 ? 16 : 18,
    fontWeight: '800',
    color: '#111',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: screenWidth < 400 ? 12 : 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: '#fff',
    color: '#111',
    marginTop: 8,
    fontSize: screenWidth < 400 ? 14 : 16,
  },
  label: {
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    fontSize: screenWidth < 400 ? 14 : 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: screenWidth < 400 ? 6 : 8,
  },
  chip: {
    paddingHorizontal: screenWidth < 400 ? 12 : 16,
    paddingVertical: screenWidth < 400 ? 8 : 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#7b2ff7',
    borderColor: '#7b2ff7',
  },
  chipText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: screenWidth < 400 ? 12 : 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 20,
    paddingVertical: screenWidth < 400 ? 12 : 14,
    borderRadius: 12,
    marginTop: 16,
    minHeight: 48,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: screenWidth < 400 ? 14 : 16,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: screenWidth < 400 ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: '700',
    color: '#111',
    fontSize: screenWidth < 400 ? 14 : 16,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: screenWidth < 400 ? 11 : 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  quantityText: {
    color: '#6B7280',
    fontSize: screenWidth < 400 ? 11 : 12,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
