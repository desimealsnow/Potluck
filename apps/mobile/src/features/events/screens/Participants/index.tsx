import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, Alert } from "react-native";
import { Image } from 'expo-image';
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components";
import { supabase } from "@/config/supabaseClient";
const API_BASE_URL = "http://localhost:3000/api/v1";
type ParticipantStatus = "invited" | "pending" | "accepted" | "declined" | "maybe";
type Participant = { id: string; user_id: string; status: ParticipantStatus; name?: string; email?: string; avatar?: string; role?: "host" | "guest"; };
export default function ParticipantsScreen({ eventId, onBack, showHeader = true }: { eventId: string; onBack?: () => void; showHeader?: boolean; }) {
  const [invite, setInvite] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Invite Friends</Text>
          <Text style={styles.label}>Email or Phone</Text>
          <View style={styles.inviteRow}>
            <Icon name="Mail" size={16} color="#9AA0A6" />
            <TextInput style={styles.inviteInput} placeholder="friend@email.com or +1234567890" placeholderTextColor="rgba(0,0,0,0.35)" value={invite} onChangeText={setInvite} autoCapitalize="none" keyboardType="email-address" />
            <Pressable onPress={() => Alert.alert('Invite sent')} style={styles.addBtn}><Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 } }), },
  cardTitle: { fontWeight: "900", color: "#9C2DD0", marginBottom: 8 },
  label: { fontWeight: "800", color: "#3C3C3C", marginBottom: 6 },
  inviteRow: { borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "#fff", height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  inviteInput: { flex: 1, marginHorizontal: 8, color: "#111" },
  addBtn: { backgroundColor: "#FF6A6A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
});
