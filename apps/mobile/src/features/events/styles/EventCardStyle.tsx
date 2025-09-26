import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 6 } }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#374151', fontSize: 18, fontWeight: '800', flex: 1, paddingRight: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  footerRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', minWidth: 64 },
  footerCenter: { flex: 1, alignItems: 'center' },
  footerRight: { minWidth: 86, alignItems: 'flex-end' },
  avatarWrap: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.25)' },
  avatar: { width: '100%', height: '100%', borderRadius: 14 },
  actionsContainer: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }), minWidth: 80 },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
