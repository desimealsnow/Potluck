import { StyleSheet, Platform } from "react-native";

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
export const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  stepper: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  stepIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  stepLabel: { marginTop: 4, fontWeight: "800", color: "#fff" },
  stepBar: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)", marginTop: 8 },

  card: {
    borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", marginBottom: 14,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } } }),
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#A22AD0" },

  label: { fontWeight: "800", color: "#3C3C3C", marginBottom: 6, marginTop: 6 },
  inputWrap: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingRight: 8, paddingLeft: 0, overflow: "hidden" },
  inputWrapMultiline: { height: 80, alignItems: "flex-start", paddingTop: 8 },
  inputIcon: { width: 40, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, paddingHorizontal: 6, fontSize: 15, color: "#1a1a1a" },
  inputMultiline: { textAlignVertical: "top", paddingTop: 8 },

  row: { flexDirection: "row", marginTop: 6 },
  sectionLabel: { fontWeight: "900", color: "#D14C4C" },

  foodRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  foodOption: { flex: 1, height: 64, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  foodOptionActive: { backgroundColor: "#1BAC55", borderColor: "transparent" },
  foodLabel: { marginTop: 6, fontWeight: "800", color: "#585858" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(205,221,255,0.6)" },
  chipActive: { backgroundColor: "rgba(157,196,255,0.95)" },
  chipText: { fontWeight: "800", color: "#3B6BB8" },
  chipTextActive: { color: "#143A79" },

  locCard: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "rgba(210,245,226,0.6)", padding: 12 },
  locTitle: { fontSize: 16, fontWeight: "900", color: "#08A04B" },
  locAddr: { marginTop: 4, color: "#2f5f4f" },
  locConfirm: { marginTop: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.75)", padding: 14, alignItems: "center" },
  locConfirmTitle: { fontWeight: "900", color: "#13864d" },
  locCoords: { marginTop: 4, color: "#2a6f4f", fontWeight: "700" },

  dishCard: { marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", backgroundColor: "rgba(255,255,255,0.85)", padding: 12 },
  dishTitle: { fontWeight: "900", color: "#8C2E6B", marginBottom: 6 },

  segmented: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.05)", padding: 4, borderRadius: 12 },
  segment: { flex: 1, borderRadius: 8, height: 38, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  segmentText: { fontWeight: "700", color: "#7A3D7A" },
  segmentTextActive: { fontWeight: "900", color: "#5A2A8C" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  rowLeft: { color: "#3b3b3b", fontWeight: "700" },
  rowRight: { fontWeight: "900", color: "#5A2A8C" },

  addBtn: { backgroundColor: "#9C5CFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },

  inviteRow: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "#fff",
    height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, marginTop: 8,
  },
  inviteInput: { flex: 1, marginHorizontal: 8, color: "#111" },

  participantPlanItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10, borderRadius: 8, marginTop: 6,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)"
  },

  ghostBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  ghostText: { fontWeight: "800", color: "#6B6B6B" },
  cta: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FF5630" },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  // Responsive container to center content on wide layouts (web/tablet)
  pageContainer: { width: "100%", maxWidth: 980 },
  cardConstrained: { width: "100%" },
  cardSurface: { backgroundColor: "#F8F5FF", borderColor: "#E9E1FF" },
  inlineActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  inlineBtn: { flex: 1 },
  cardTitleAlt: { color: "#5A2A8C" },
});
