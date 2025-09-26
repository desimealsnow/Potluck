import { StyleSheet, Platform } from "react-native";

/* ---------------- Styles ---------------- */
export const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontSize: 18, fontWeight: "900", color: "#C23B27" },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.6)" },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 },
    }),
  },
  cardTitle: { fontWeight: "900", color: "#9C2DD0", marginBottom: 8 },

  label: { fontWeight: "800", color: "#3C3C3C", marginBottom: 6 },
  inviteRow: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "#fff",
    height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10,
  },
  inviteInput: { flex: 1, marginHorizontal: 8, color: "#111" },
  addBtn: { backgroundColor: "#FF6A6A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },

  copyLink: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
    marginTop: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#F6F8FF",
  },
  copyLinkText: { marginLeft: 8, color: "#4253FF", fontWeight: "800" },

  filters: { flexDirection: "row", gap: 8, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)" },
  chipText: { fontWeight: "700", color: "#6B7280" },
  subtleRight: { textAlign: "right", marginTop: 8, color: "#777", fontWeight: "600" },

  sectionTitle: { fontWeight: "900", color: "#C27700" },

  personCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    backgroundColor: "#fff",
    marginLeft: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  summaryTitle: { fontWeight: "900", color: "#7A3D7A", marginBottom: 10 },
  summaryRow: { flexDirection: "row", gap: 8 },
});
