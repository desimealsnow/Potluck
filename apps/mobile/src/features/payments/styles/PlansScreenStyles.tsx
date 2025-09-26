import { StyleSheet, Platform } from "react-native";

/* --------------- Styles --------------- */
export const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)" },
  title: { fontWeight: "900", color: "#1e1e1e", fontSize: 16 },

  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.35)",
    padding: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  segment: { flex: 1, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontWeight: "800", color: "rgba(0,0,0,0.7)" },
  segmentTextActive: { color: "#111" },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 24,
    marginBottom: 20,
    position: "relative",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 5 },
    }),
  },
  currentCard: {
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  popularCard: {
    borderWidth: 2,
    borderColor: "#FF9800",
  },
  badge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  currentBadge: {
    backgroundColor: "#4CAF50",
  },
  popularBadge: {
    backgroundColor: "#FF9800",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  cardHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111",
    marginTop: 8,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111"
  },
  per: {
    fontSize: 18,
    fontWeight: "500",
    color: "rgba(0,0,0,0.6)",
    marginLeft: 4,
  },
  desc: {
    color: "rgba(0,0,0,0.65)",
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  features: {
    marginBottom: 20,
  },
  featRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featText: {
    color: "#111",
    fontWeight: "500",
    fontSize: 16,
    flex: 1,
  },

  trialBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "#3B82F6",
    marginBottom: 16,
  },
  trialText: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 14
  },

  chooseBtn: {
    marginTop: 8,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e1e"
  },
  currentBtn: {
    backgroundColor: "#9C27B0",
    opacity: 0.8,
  },
  popularBtn: {
    backgroundColor: "#1e1e1e",
  },
  chooseBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  currentBtnText: {
    color: "#fff",
  },
  popularBtnText: {
    color: "#fff",
  },

  promoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.55)",
    padding: 12,
    marginTop: 2,
  },
  promoLabel: { fontWeight: "900", color: "#111", marginBottom: 8 },
  promoRow: { height: 46, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  promoInput: { flex: 1, color: "#111" },
  applyBtn: { height: 34, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F2F2" },
  finePrint: { marginTop: 8, color: "rgba(0,0,0,0.6)", fontSize: 12 },

  faqHeader: { marginTop: 18, marginBottom: 6, fontWeight: "900", color: "#111" },
  faqItem: { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", marginBottom: 8 },
  faqQ: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12 },
  faqQText: { fontWeight: "800", color: "#111" },
  faqA: { paddingHorizontal: 12, paddingBottom: 12, color: "rgba(0,0,0,0.75)" },
});
