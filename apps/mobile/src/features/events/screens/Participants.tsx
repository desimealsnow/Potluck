// ParticipantsScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Image } from 'expo-image';
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
// Note: expo-clipboard not available in this setup
import { Icon } from "@/ui";
import { supabase } from "@/config/supabaseClient";

/* ---------------- Config / REST toggle ---------------- */
const API_BASE_URL = "http://localhost:3000/api/v1"; // Backend server URL
const USE_MOCK = false; // Use real API

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCK) return mockApi<T>(path, init);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {})
  };
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }
  
  return res.json();
}

/* ---------------- Types ---------------- */
type ParticipantStatus = "invited" | "pending" | "accepted" | "declined" | "maybe";

// Backend API types matching the schema
type Participant = {
  id: string;
  user_id: string;
  status: ParticipantStatus;
  joined_at?: string;
  // Extended with user info (from joins)
  name?: string;
  email?: string;
  avatar?: string;
  role?: "host" | "guest";
};

type ParticipantAdd = {
  user_id: string;
  status?: ParticipantStatus;
};

type ParticipantUpdate = {
  status: ParticipantStatus;
};

/* ---------------- Screen ---------------- */
export default function ParticipantsScreen({
  eventId,
  onBack,
  showHeader = true,
}: {
  eventId: string;
  onBack?: () => void;
  showHeader?: boolean;
}) {
  // Invite box
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data from backend
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");
  const gradient = useMemo(
    () => ["#FFE1C6", "#FFD9E2", "#FFF0CD"] as const, // top header gradient
    []
  );

  // Load participants data
  const loadParticipants = async () => {
    try {
      setLoading(true);
      const [data, eventResp, me] = await Promise.all([
        api<Participant[]>(`/events/${eventId}/participants`),
        api<any>(`/events/${eventId}`),
        api<{ user_id: string }>(`/user-profile/me`).catch(() => undefined),
      ]);
      const createdBy: string | undefined = (eventResp as any)?.event?.created_by;
      const meId: string | undefined = (me as any)?.user_id;

      let withRoles = (Array.isArray(data) ? data : []).map((p) => {
        const isHost = createdBy ? (p.user_id === createdBy) : (meId ? (p.user_id === meId) : false);
        return {
          ...p,
          role: p.role || (isHost ? "host" : "guest"),
        } as Participant;
      });

      // Enrich host details from user_profiles if missing
      if (createdBy) {
        // Try event payload host fields first
        const hostNameFromEvent = (eventResp as any)?.host?.name
          || (eventResp as any)?.event?.host?.name
          || (eventResp as any)?.event?.host?.display_name;
        const hostAvatarFromEvent = (eventResp as any)?.host?.avatar_url
          || (eventResp as any)?.event?.host?.avatar_url
          || (eventResp as any)?.event?.host?.avatar;
        if (hostNameFromEvent || hostAvatarFromEvent) {
          withRoles = withRoles.map(p => p.user_id === createdBy ? {
            ...p,
            name: p.name || hostNameFromEvent || p.name,
            avatar: p.avatar || hostAvatarFromEvent || p.avatar,
          } : p);
        }

        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name, avatar_url, email')
            .eq('user_id', createdBy)
            .maybeSingle();
          if (profile) {
            withRoles = withRoles.map(p => p.user_id === createdBy ? {
              ...p,
              name: p.name || (profile.display_name as string | undefined) || p.name,
              email: p.email || (profile.email as string | undefined) || p.email,
              avatar: p.avatar || (profile.avatar_url as string | undefined) || p.avatar,
            } : p);
          }
        } catch {}
      }

      setParticipants(withRoles);
    } catch (error) {
      console.error("Failed to load participants:", error);
      Alert.alert("Error", "Failed to load participants");
    } finally {
      setLoading(false);
    }
  };

  // Refresh participants data
  const refreshParticipants = async () => {
    try {
      setRefreshing(true);
      await loadParticipants();
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on mount
  React.useEffect(() => {
    loadParticipants();
  }, [eventId]);

  // Derived data
  const hosts = participants.filter((p) => p.role === "host");
  const invitees = participants.filter((p) => p.role === "guest" || !p.role);
  const acceptedCount = invitees.filter((p) => p.status === "accepted").length;
  const pendingCount = invitees.filter((p) => p.status === "pending" || p.status === "invited").length;

  const filteredInvitees =
    filter === "pending"
      ? invitees.filter((p) => p.status === "pending")
      : filter === "accepted"
      ? invitees.filter((p) => p.status === "accepted")
      : invitees;

  async function handleAddInvite() {
    const value = invite.trim();
    if (!value) return;
    
    // For now, we'll need a user_id. In a real app, you'd search users by email/phone
    // This is a simplified implementation - you might want to add user search functionality
    if (!value.includes("@")) {
      Alert.alert("Invalid input", "Please enter a valid email address");
      return;
    }

    try {
      // TODO: In a real implementation, you'd first search for the user by email
      // For now, we'll use a mock user_id
      const mockUserId = `user_${Date.now()}`;
      
      const participantData: ParticipantAdd = {
        user_id: mockUserId,
        status: "invited"
      };

      await api(`/events/${eventId}/participants`, {
        method: "POST",
        body: JSON.stringify(participantData),
      });

      setInvite("");
      Alert.alert("Invite sent", "Your friend has been invited.");
      
      // Refresh the participants list
      await loadParticipants();
    } catch (e: any) {
      Alert.alert("Failed to invite", e?.message ?? "Unknown error");
    }
  }

  async function resendInvite(participantId: string) {
    try {
      await api(`/events/${eventId}/participants/${participantId}/resend`, { method: 'POST' });
      Alert.alert('Invite resent', 'Invitation email has been resent.');
    } catch (e: any) {
      Alert.alert('Failed to resend', e?.message ?? 'Unknown error');
    }
  }

  async function bulkInvite(emails: string[]) {
    try {
      const invites = emails.filter(e => e.includes('@')).map(e => ({ user_id: `user_${e}` }));
      await api(`/events/${eventId}/participants/bulk`, { method: 'POST', body: JSON.stringify({ invites }) });
      Alert.alert('Bulk Invites Sent', `${invites.length} invites queued.`);
      loadParticipants();
    } catch (e: any) {
      Alert.alert('Bulk invite failed', e?.message ?? 'Unknown error');
    }
  }

  async function copyLink() {
    const link = `${API_BASE_URL}/join/${eventId}`;
    // TODO: Add clipboard functionality when available
    Alert.alert("Invite Link", link);
  }

  async function updateStatus(participantId: string, newStatus: ParticipantStatus) {
    try {
      // Optimistic update
      setParticipants((prev) => 
        prev.map((p) => (p.id === participantId ? { ...p, status: newStatus } : p))
      );

      const updateData: ParticipantUpdate = {
        status: newStatus
      };

      await api(`/events/${eventId}/participants/${participantId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      Alert.alert("Status updated", "Participant status has been updated.");
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert("Error", "Failed to update participant status");
      // Revert optimistic update on error
      await loadParticipants();
    }
  }

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        {showHeader && (
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.iconBtn}>
              <Icon name="ChevronLeft" size={20} color="#5B5B5B" />
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="Users" size={18} color="#A44500" />
              <Text style={styles.topTitle}>Participants</Text>
            </View>
            <Pressable style={styles.iconBtn}>
              <Icon name="Ellipsis" size={18} color="#6B6B6B" />
            </Pressable>
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Invite friends card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 Invite Friends</Text>

            <Text style={styles.label}>Email or Phone</Text>
            <View style={styles.inviteRow}>
              <Icon name="Mail" size={16} color="#9AA0A6" />
              <TextInput
                style={styles.inviteInput}
                placeholder="friend@email.com or +1234567890"
                placeholderTextColor="rgba(0,0,0,0.35)"
                value={invite}
                onChangeText={setInvite}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable onPress={handleAddInvite} style={styles.addBtn}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text>
              </Pressable>
            </View>

            <Pressable onPress={copyLink} style={styles.copyLink}>
              <Icon name="Link" size={16} color="#6B7AFF" />
              <Text style={styles.copyLinkText}>Copy invite link</Text>
              <Icon name="Copy" size={16} color="#6B7AFF" style={{ marginLeft: "auto" }} />
            </Pressable>
          </View>

          {/* Filters */}
          <View style={[styles.card, { paddingVertical: 10 }]}>
            <View style={styles.filters}>
              <FilterChip
                active={filter === "all"}
                label={`All`}
                onPress={() => setFilter("all")}
                icon="Users"
              />
              <FilterChip
                active={filter === "pending"}
                label={`Pending ${pendingCount ? `(${pendingCount})` : ""}`}
                onPress={() => setFilter("pending")}
                icon="Hourglass"
              />
              <FilterChip
                active={filter === "accepted"}
                label={`Accepted`}
                onPress={() => setFilter("accepted")}
                icon="CircleCheck"
              />
            </View>
            <Text style={styles.subtleRight}>
              {acceptedCount} accepted, {pendingCount} pending
            </Text>
          </View>

          {/* Hosts */}
          <Section title="🏆 Hosts">
            {hosts.map((p) => (
              <PersonRow key={p.id} participant={p} />
            ))}
          </Section>

          {/* Invitees */}
          <Section title={`🧑‍🤝‍🧑 Invitees (${invitees.length})`}>
            {filteredInvitees.map((p) => (
              <PersonRow
                key={p.id}
                participant={p}
                showActions
                onSetStatus={(s) => updateStatus(p.id, s)}
                onResend={() => resendInvite(p.id)}
              />
            ))}
          </Section>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Participant Summary</Text>
            <View style={styles.summaryRow}>
              <SummaryBox label="Confirmed" value={String(acceptedCount)} color="#1B8A5A" />
              <SummaryBox label="Pending" value={String(pendingCount)} color="#C27700" />
              <SummaryBox label="Total Invited" value={String(participants.length)} color="#444" />
            </View>
          </View>
        </ScrollView>

        {/* Bottom actions (optional) */}
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------------- Components ---------------- */

function FilterChip({
  active,
  label,
  onPress,
  icon,
}: {
  active?: boolean;
  label: string;
  onPress: () => void;
  icon: import("@/ui/Icon").IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: "rgba(255,140,90,0.14)", borderColor: "transparent" },
      ]}
    >
      <Icon name={icon} size={14} color={active ? "#F24E1E" : "#9DA4AE"} style={{ marginRight: 6 }} />
      <Text style={[styles.chipText, active && { color: "#D84E29", fontWeight: "800" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 10, marginTop: 8 }}>{children}</View>
    </View>
  );
}

function PersonRow({
  participant,
  showActions = false,
  onSetStatus,
  onResend,
}: {
  participant: Participant;
  showActions?: boolean;
  onSetStatus?: (s: ParticipantStatus) => void;
  onResend?: () => void;
}) {
  const { name, email, avatar, role, status } = participant;
  const displayName = name || "Unknown User";
  
  return (
    <View style={styles.personCard}>
      <Avatar name={displayName} src={avatar} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text numberOfLines={1} style={{ fontWeight: "800", color: "#333" }}>
          {displayName}
        </Text>
        <Text numberOfLines={1} style={{ color: "#777", marginTop: 3, fontSize: 12 }}>
          {email ?? "—"}
        </Text>
      </View>

      {/* Role pill */}
      <Pill
        tone={role === "host" ? "orange" : "blue"}
        label={role === "host" ? "Host" : "Guest"}
      />

      {/* Status pill / actions */}
      {showActions ? (
        <View style={{ flexDirection: "row", marginLeft: 8 }}>
          <StatusButton
            active={status === "accepted"}
            label="Accept"
            icon="Check"
            onPress={() => onSetStatus?.("accepted")}
          />
          <StatusButton
            active={status === "pending"}
            label="Pending"
            icon="Clock"
            onPress={() => onSetStatus?.("pending")}
          />
          <StatusButton
            active={status === "declined"}
            label="Decline"
            icon="X"
            onPress={() => onSetStatus?.("declined")}
          />
          {status === 'invited' && (
            <StatusButton
              label="Resend"
              icon="Send"
              onPress={() => onResend?.()}
            />
          )}
        </View>
      ) : (
        <Pill
          style={{ marginLeft: 8 }}
          tone={
            status === "accepted" ? "green" : 
            status === "pending" || status === "invited" ? "amber" : 
            "rose"
          }
          label={
            status === "accepted" ? "Accepted" : 
            status === "pending" ? "Pending" :
            status === "invited" ? "Invited" :
            status === "declined" ? "Declined" :
            "Maybe"
          }
          icon={
            status === "accepted" ? "Check" : 
            status === "pending" || status === "invited" ? "Clock" : 
            status === "declined" ? "X" :
            "CircleQuestionMark"
          }
        />
      )}
    </View>
  );
}

function StatusButton({
  active,
  label,
  icon,
  onPress,
}: {
  active?: boolean;
  label: string;
  icon: import("@/ui/Icon").IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusBtn,
        active && { backgroundColor: "rgba(0,0,0,0.85)" },
      ]}
    >
      <Icon name={icon} size={12} color={active ? "#fff" : "#333"} />
      <Text style={{ fontSize: 11, fontWeight: "800", color: active ? "#fff" : "#333", marginLeft: 4 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Pill({
  label,
  tone,
  icon,
  style,
}: {
  label: string;
  tone: "green" | "amber" | "rose" | "orange" | "pink" | "blue";
  icon?: import("@/ui/Icon").IconName;
  style?: any;
}) {
  const map = {
    green: { bg: "#D1FAE5", fg: "#065F46" },
    amber: { bg: "#FEF3C7", fg: "#92400E" },
    rose: { bg: "#FFE4E6", fg: "#9F1239" },
    orange: { bg: "#FFE7D6", fg: "#9A3412" },
    pink: { bg: "#FDE2FF", fg: "#86198F" },
    blue: { bg: "#DBEAFE", fg: "#1E3A8A" },
  } as const;
  const t = map[tone];
  return (
    <View style={[{ backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: "row", alignItems: "center" }, style]}>
      {icon ? <Icon name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: t.fg, fontWeight: "800", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name.split(" ").map((s) => s[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  return src ? (
    <Image source={{ uri: src }} style={{ width: 44, height: 44, borderRadius: 22 }} />
  ) : (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEE", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontWeight: "900", color: "#666" }}>{initials || "?"}</Text>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
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

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}>
      <Text style={{ color: "#666", fontWeight: "700" }}>{label}</Text>
      <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "900", color }}>{value}</Text>
    </View>
  );
}

/* ---------------- Helpers / mock ---------------- */
function deriveName(contact: string) {
  if (contact.includes("@")) return contact.split("@")[0].replace(/[._]/g, " ");
  return `+${contact.slice(-4)}`;
}
function seedParticipants(): Participant[] {
  return [
    { 
      id: "p1", 
      user_id: "user_1",
      name: "Alex Chen", 
      email: "alex.chen@email.com", 
      avatar: "https://i.pravatar.cc/100?img=62", 
      role: "host", 
      status: "accepted",
      joined_at: new Date().toISOString()
    },
    { 
      id: "p2", 
      user_id: "user_2",
      name: "Sarah Johnson", 
      email: "sarah.j@email.com", 
      avatar: "https://i.pravatar.cc/100?img=15", 
      role: "guest", 
      status: "accepted",
      joined_at: new Date().toISOString()
    },
    { 
      id: "i1", 
      user_id: "user_3",
      name: "M R", 
      email: "mike.r@email.com", 
      role: "guest", 
      status: "pending",
      joined_at: new Date().toISOString()
    },
    { 
      id: "i2", 
      user_id: "user_4",
      name: "Emma Wilson", 
      email: "emma.w@email.com", 
      avatar: "https://i.pravatar.cc/100?img=47", 
      role: "guest", 
      status: "accepted",
      joined_at: new Date().toISOString()
    },
    { 
      id: "i3", 
      user_id: "user_5",
      name: "David Kim", 
      email: "david.k@email.com", 
      role: "guest", 
      status: "declined",
      joined_at: new Date().toISOString()
    },
  ];
}
async function mockApi<T>(path: string, _init?: RequestInit): Promise<any> {
  await new Promise((r) => setTimeout(r, 200));
  
  if (path.includes("/participants") && _init?.method !== "POST" && _init?.method !== "PUT") {
    return seedParticipants();
  }
  
  return { ok: true };
}
