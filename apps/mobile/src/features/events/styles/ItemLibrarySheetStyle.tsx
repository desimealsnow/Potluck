import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  webOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#111' },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', marginRight: 8 },
  tabActive: { backgroundColor: '#111' },
  tabText: { fontWeight: '700', color: '#374151' },
  tabTextActive: { color: '#fff' },
  searchWrap: { marginHorizontal: 12, marginTop: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', borderRadius: 10, height: 40, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 8, color: '#111' },
  searchBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#111' },
  searchBtnText: { color: '#fff', fontWeight: '800' },
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontWeight: '800', color: '#111' },
  rowSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  rowMeta: { color: '#111', fontWeight: '700' },
});
