import { StyleSheet, Platform } from "react-native";

/* ---------------- Styles ---------------- */
export const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontWeight: "900", color: "#8A36C1" },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  bannerGreen: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#CFF9E5",
    borderWidth: 1,
    borderColor: "#A3EED1",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bannerGreenText: { color: "#0B5E3B", fontWeight: "800" },
  bannerNeutral: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bannerNeutralText: { color: "#4B5563", fontWeight: "700" },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 },
    }),
  },
  planTitle: { fontWeight: "900", color: "#D24A63" },
  price: { marginTop: 6, fontSize: 26, fontWeight: "900", color: "#EB4C4C" },

  bigGradientBtn: { marginBottom: 10 },
  bigGradientInner: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bigGradientText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBEFDA",
    backgroundColor: "#E7FBF0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryBtnText: { fontWeight: "900" },

  empty: {
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },
  emptyTitle: { fontWeight: "900", color: "#6C2BD2" },
  emptyText: { textAlign: "center", marginTop: 6, color: "#6B7280" },
  bigCta: { marginTop: 10, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0B16", paddingHorizontal: 16 },
  bigCtaText: { color: "#fff", fontWeight: "900" },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { color: "#6B7280", fontWeight: "800" },
  rowValue: { color: "#111", fontWeight: "800" },

  invoicesHeader: { marginTop: 16, marginBottom: 6, fontWeight: "900", color: "#111" },
  invoiceRow: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#E9FFF3",
    borderWidth: 1,
    borderColor: "#C8F7DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  invDate: { fontWeight: "900", color: "#111" },
  invAmount: { color: "#6B7280", marginTop: 2, fontWeight: "700" },

  // Plan card styles
  planCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 },
    }),
  },
  recommendedPlan: {
    borderColor: "#8A36C1",
    borderWidth: 2,
    backgroundColor: "rgba(138,54,193,0.05)",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },
  recommendedBadge: {
    backgroundColor: "#8A36C1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "900",
    color: "#8A36C1",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  iconOnly: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
});
