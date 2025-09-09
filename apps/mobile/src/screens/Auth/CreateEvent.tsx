import React, { useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, Alert, Modal
} from "react-native";
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ParticipantsScreen from "./Participants";
import { apiClient } from "@/services/apiClient";
import { Card, Input, Label, Button, Chip, Badge, Segmented, FoodOption, Stepper } from "@/components";
import { formatDate, formatTime, combineDateTime } from "@/utils/dateUtils";
import { gradients } from "@/theme";
import type { 
  MealType, 
  LocationSuggestion, 
  Dish, 
  EventCreatePayload, 
  StepperStep,
  RSVPStatus 
} from "@common/types";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const USE_MOCK = false; // Use real API

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function CreateEventScreen({ 
  onEventCreated, 
  onBack 
}: { 
  onEventCreated?: (eventId: string) => void; 
  onBack?: () => void; 
}) {
  const [step, setStep] = useState<StepperStep>(0);

  // Step 1 – Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [minGuests, setMinGuests] = useState("1");
  const [maxGuests, setMaxGuests] = useState("10");
  const [mealType, setMealType] = useState<MealType>("veg");

  // Step 2 – Location
  const [locQuery, setLocQuery] = useState("");
  const [popular, setPopular] = useState<LocationSuggestion[]>([
    { label: "Central Park", address: "Central Park, New York, NY 10024, USA", latitude: 40.7829, longitude: -73.9654 },
    { label: "Times Square", address: "Manhattan, NY 10036, USA", latitude: 40.758, longitude: -73.9855 },
    { label: "Brooklyn Bridge Park", address: "Brooklyn, NY 11201, USA", latitude: 40.7003, longitude: -73.9967 },
  ]);
  const [selectedLoc, setSelectedLoc] = useState<LocationSuggestion | null>(null);

  // Step 3 – Items
  const [dishes, setDishes] = useState<Dish[]>([
    { id: "d1", name: "", category: "Main Course", per_guest_qty: 1 },
  ]);

  // Step 4 – Participants (after event is created)
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  
  // Pre-creation participant planning
  const [plannedParticipants, setPlannedParticipants] = useState<string[]>([]);

  const totalDishes = dishes.filter(d => d.name.trim().length > 0).length;
  const guests = Math.max(1, parseInt(minGuests || "1", 10));
  const servings = dishes.reduce((sum, d) => sum + (d.name.trim() ? d.per_guest_qty * guests : 0), 0);

  const canNextFromDetails =
    title.trim().length >= 2 &&
    selectedDate && selectedTime &&
    parseInt(maxGuests || "0", 10) >= parseInt(minGuests || "0", 10);

  const canNextFromLocation = !!selectedLoc;

  const headerGradient = useMemo(
    () => gradients.header.warm,
    []
  );


  const submit = async () => {
    try {
      if (!selectedLoc) {
        Alert.alert("Missing location", "Please select a location for your event.");
        return;
      }

      const payload: EventCreatePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: combineDateTime(selectedDate, selectedTime),
        min_guests: Number(minGuests),
        max_guests: Number(maxGuests) || undefined,
        meal_type: mealType,
        location: {
          name: selectedLoc.label,
          formatted_address: selectedLoc.address,
          latitude: selectedLoc.latitude,
          longitude: selectedLoc.longitude,
        },
        items: dishes
          .filter(d => d.name.trim())
          .map(d => ({
            name: d.name.trim(),
            category: d.category || undefined,
            per_guest_qty: d.per_guest_qty
          }))
      };

      const response = await apiClient.post<{ event: { id: string } }>("/events", payload);

      if (response.event?.id) {
        setCreatedEventId(response.event.id);
        Alert.alert("🎉 Potluck created!", "Your event has been saved successfully!", [
          {
            text: "OK",
            onPress: () => {
              if (onEventCreated) {
                onEventCreated(response.event.id);
              }
            }
          }
        ]);
      }
    } catch (e: any) {
      console.error("Create event error:", e);
      Alert.alert("Failed to create", e?.message ?? "Unknown error");
    }
  };

  return (
    <LinearGradient colors={headerGradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            {onBack && (
              <Pressable onPress={onBack} style={{ marginRight: 8 }} hitSlop={10}>
                <Ionicons name="arrow-back" size={20} color="#CC3B2B" />
              </Pressable>
            )}
            <Ionicons name="restaurant" size={20} color="#CC3B2B" />
            <Text style={styles.topTitle}>Create Potluck</Text>
          </View>
          <Ionicons name="moon" size={18} color="#D38B2E" />
        </View>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Body */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {step === 0 && (
            <Card title="🎉 Potluck Details">
              {/* Title */}
              <Label>Event Title</Label>
              <Input placeholder="Enter title" value={title} onChangeText={setTitle} />

              {/* Description */}
              <Label>Description (Optional)</Label>
              <Input 
                placeholder="Tell guests about your event..." 
                value={description} 
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top', borderWidth: 0 }}
              />

              {/* Date + Time */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Label>Date</Label>
                  <Pressable onPress={() => setShowDatePicker(true)} style={styles.inputWrap}>
                    <View style={styles.inputIcon}>
                      <Ionicons name="calendar" size={16} color="#9DA4AE" />
                    </View>
                    <Text style={[styles.input, { color: "#1a1a1a" }]}>
                      {formatDate(selectedDate)}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Label>Time</Label>
                  <Pressable onPress={() => setShowTimePicker(true)} style={styles.inputWrap}>
                    <View style={styles.inputIcon}>
                      <Ionicons name="time" size={16} color="#9DA4AE" />
                    </View>
                    <Text style={[styles.input, { color: "#1a1a1a" }]}>
                      {formatTime(selectedTime)}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Guests */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Label>Min Guests</Label>
                  <Input
                    keyboardType="number-pad"
                    value={minGuests}
                    onChangeText={(v) => setMinGuests(v.replace(/[^0-9]/g, ""))}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Label>Max Guests</Label>
                  <Input
                    keyboardType="number-pad"
                    value={maxGuests}
                    onChangeText={(v) => setMaxGuests(v.replace(/[^0-9]/g, ""))}
                  />
                </View>
              </View>

              {/* Meal Type */}
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>🍴 Meal Type</Text>
              <View style={styles.foodRow}>
                <FoodOption
                  selected={mealType === "veg"}
                  label="Vegetarian"
                  icon="leaf"
                  onPress={() => setMealType("veg")}
                />
                <FoodOption
                  selected={mealType === "nonveg"}
                  label="Non-Veg"
                  icon="restaurant"
                  onPress={() => setMealType("nonveg")}
                />
                <FoodOption
                  selected={mealType === "mixed"}
                  label="Mixed"
                  icon="fast-food"
                  onPress={() => setMealType("mixed")}
                />
              </View>
            </Card>
          )}

          {step === 1 && (
            <Card title="📍 Where's the feast?">
              <Label>Search Location</Label>
              <Input
                placeholder="Search for the perfect spot..."
                value={locQuery}
                onChangeText={setLocQuery}
                leftIcon="home"
                onSubmitEditing={async () => {
                  if (locQuery.trim()) {
                    try {
                      const res = await apiClient.get<LocationSuggestion[]>(`/locations?search=${encodeURIComponent(locQuery.trim())}`);
                      setPopular(res);
                    } catch (error) {
                      console.warn("Location search failed:", error);
                      Alert.alert("Search failed", "Unable to search locations. Please try again.");
                    }
                  }
                }}
              />

              {/* Popular */}
              <Text style={[styles.sectionLabel, { marginTop: 12 }]}>🏛️ Popular Spots</Text>
              <View style={styles.chips}>
                {popular.map((p) => (
                  <Pressable key={p.label} onPress={() => setSelectedLoc(p)} style={[styles.chip, selectedLoc?.label === p.label && styles.chipActive]}>
                    <Text style={[styles.chipText, selectedLoc?.label === p.label && styles.chipTextActive]}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Selected */}
              {selectedLoc && (
                <View style={styles.locCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.locTitle}>{selectedLoc.label}</Text>
                    <Pressable onPress={() => setSelectedLoc(null)} hitSlop={10}>
                      <Ionicons name="close" size={18} color="#db4d4d" />
                    </Pressable>
                  </View>
                  <Text style={styles.locAddr}>{selectedLoc.address}</Text>
                  <View style={styles.locConfirm}>
                    <Text style={styles.locConfirmTitle}>Location Confirmed!</Text>
                    {selectedLoc.latitude && selectedLoc.longitude && (
                      <Text style={styles.locCoords}>
                        {selectedLoc.latitude.toFixed(4)}, {selectedLoc.longitude.toFixed(4)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </Card>
          )}

          {step === 2 && (
            <>
              <Card
                title="✨ What's on the menu?"
                right={<Pressable onPress={() => addDish(setDishes)} style={styles.addBtn}><Text style={{ color: "#fff", fontWeight: "800" }}>+ Add Dish</Text></Pressable>}
              >
                {dishes.map((d, idx) => (
                  <View key={d.id} style={styles.dishCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.dishTitle}>🍖 Dish #{idx + 1}</Text>
                      <Pressable onPress={() => removeDish(d.id, setDishes)} hitSlop={10}>
                        <Ionicons name="close" size={18} color="#a36" />
                      </Pressable>
                    </View>

                    <Label>Item Name</Label>
                    <Input
                      placeholder="e.g., Grandma's Famous Mac & Cheese"
                      value={d.name}
                      onChangeText={(t) => updateDish(d.id, { name: t }, setDishes)}
                    />

                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Label>Category</Label>
                        <Segmented
                          options={[
                            { key: "Main Course", label: "Main Course" },
                            { key: "Starter", label: "Starter" },
                            { key: "Dessert", label: "Dessert" }
                          ]}
                          value={d.category || "Main Course"}
                          onChange={(v) => updateDish(d.id, { category: v }, setDishes)}
                        />
                      </View>
                      <View style={{ width: 100 }}>
                        <Label>Per Guest</Label>
                        <Input
                          keyboardType="number-pad"
                          value={String(d.per_guest_qty)}
                          onChangeText={(v) => updateDish(d.id, { per_guest_qty: Math.max(0, parseInt(v || "0", 10)) || 0 }, setDishes)}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", marginTop: 8, alignItems: "center", gap: 8 }}>
                      <Badge text={d.category || "Main Course"} tone="peach" />
                      <Badge text={`Need: ${Math.max(0, d.per_guest_qty * guests)} (${d.per_guest_qty} × ${guests})`} tone="indigo" />
                    </View>
                  </View>
                ))}
              </Card>

              <Card title="📊 Menu Summary">
                <Row label="Total Dishes:" value={String(totalDishes)} />
                <Row label={`For ${guests} guests:`} value={`${servings} servings`} />
              </Card>
            </>
          )}

          {step === 3 && (
            <Card title="👥 Plan Your Guest List">
              <Text style={styles.label}>
                {createdEventId 
                  ? "Your event has been created! Now you can invite participants." 
                  : "Review your event details below, then create your potluck to start inviting participants."
                }
              </Text>
              
              {createdEventId ? (
                <ParticipantsScreen 
                  eventId={createdEventId} 
                  showHeader={false}
                />
              ) : (
                <View style={{ marginTop: 16 }}>
                  {/* Participant Planning */}
                  <Text style={[styles.label, { fontSize: 16, color: "#7A3D7A" }]}>👥 Plan Your Guest List</Text>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.8)", padding: 14, borderRadius: 12, marginTop: 8 }}>
                    <Label>Add Participant Emails</Label>
                    <ParticipantPlanningInput 
                      participants={plannedParticipants}
                      onAddParticipant={(email) => setPlannedParticipants(prev => [...prev, email])}
                      onRemoveParticipant={(index) => setPlannedParticipants(prev => prev.filter((_, i) => i !== index))}
                    />
                  </View>

                  <Text style={[styles.label, { fontSize: 16, color: "#7A3D7A", marginTop: 16 }]}>📋 Event Summary</Text>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.8)", padding: 14, borderRadius: 12, marginTop: 8 }}>
                    <Row label="Event Title:" value={title} />
                    <Row label="Date & Time:" value={`${formatDate(selectedDate)} at ${formatTime(selectedTime)}`} />
                    <Row label="Location:" value={selectedLoc?.label || "Not selected"} />
                    <Row label="Guests:" value={`${minGuests} - ${maxGuests} people`} />
                    <Row label="Meal Type:" value={mealType === "veg" ? "Vegetarian" : mealType === "nonveg" ? "Non-Vegetarian" : "Mixed"} />
                    <Row label="Dishes:" value={`${totalDishes} items planned`} />
                    <Row label="Planned Participants:" value={`${plannedParticipants.length} people`} />
                  </View>
                  <Text style={[styles.label, { marginTop: 16, textAlign: "center", color: "#666" }]}>
                    Click "Create Potluck" below to finalize your event and invite participants!
                  </Text>
                </View>
              )}
            </Card>
          )}
        </ScrollView>

        {/* Sticky footer */}
        <LinearGradient colors={["#FFE2CF", "#FFD6D4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.footer}>
          <View style={styles.footerInner}>
            <Pressable
              onPress={() => setStep((s) => Math.max(0, s - 1) as StepperStep)}
              disabled={step === 0}
              style={[styles.ghostBtn, step === 0 && { opacity: 0.5 }]}
            >
              <Text style={styles.ghostText}>Back</Text>
            </Pressable>

            {step < 3 ? (
              <Pressable
                onPress={() => {
                  if (step === 0 && !canNextFromDetails) return Alert.alert("Missing info", "Please fill title, date, time and valid guest counts.");
                  if (step === 1 && !canNextFromLocation) return Alert.alert("Pick a location", "Please select a location to continue.");
                  setStep((s) => Math.min(3, s + 1) as StepperStep);
                }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable 
                onPress={submit}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>🎉 Create Potluck!</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* React Native Paper Date Picker */}
      <DatePickerModal
        locale="en"
        mode="single"
        visible={showDatePicker}
        onDismiss={() => setShowDatePicker(false)}
        date={selectedDate}
        onConfirm={(params) => {
          setShowDatePicker(false);
          if (params.date) {
            setSelectedDate(params.date);
          }
        }}
      />

      {/* React Native Paper Time Picker */}
      <TimePickerModal
        visible={showTimePicker}
        onDismiss={() => setShowTimePicker(false)}
        onConfirm={(params) => {
          setShowTimePicker(false);
          const newTime = new Date();
          newTime.setHours(params.hours, params.minutes);
          setSelectedTime(newTime);
        }}
        hours={selectedTime?.getHours() || 12}
        minutes={selectedTime?.getMinutes() || 0}
      />
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLeft}>{label}</Text>
      <Text style={styles.rowRight}>{value}</Text>
    </View>
  );
}

function ParticipantPlanningInput({ 
  participants, 
  onAddParticipant, 
  onRemoveParticipant 
}: { 
  participants: string[]; 
  onAddParticipant: (email: string) => void;
  onRemoveParticipant: (index: number) => void;
}) {
  const [email, setEmail] = useState("");

  const handleAdd = () => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && trimmedEmail.includes("@") && !participants.includes(trimmedEmail)) {
      onAddParticipant(trimmedEmail);
      setEmail("");
    } else if (!trimmedEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
    } else if (participants.includes(trimmedEmail)) {
      Alert.alert("Already Added", "This email is already in your participant list");
    }
  };

  return (
    <View>
      <View style={styles.inviteRow}>
        <Ionicons name="mail" size={16} color="#9AA0A6" />
        <TextInput
          style={styles.inviteInput}
          placeholder="friend@email.com"
          placeholderTextColor="rgba(0,0,0,0.35)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onSubmitEditing={handleAdd}
        />
        <Pressable onPress={handleAdd} style={styles.addBtn}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text>
        </Pressable>
      </View>

      {participants.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.label, { fontSize: 14 }]}>Planned Participants ({participants.length})</Text>
          {participants.map((participant, index) => (
            <View key={index} style={styles.participantPlanItem}>
              <Ionicons name="person" size={16} color="#666" />
              <Text style={{ flex: 1, marginLeft: 8, color: "#333" }}>{participant}</Text>
              <Pressable onPress={() => onRemoveParticipant(index)} hitSlop={10}>
                <Ionicons name="close" size={16} color="#db4d4d" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Dishes helpers                                                      */
/* ------------------------------------------------------------------ */
function addDish(set: React.Dispatch<React.SetStateAction<Dish[]>>) {
  set((prev) => [...prev, { id: `d${Date.now()}`, name: "", category: "Main Course", per_guest_qty: 1 }]);
}
function removeDish(id: string, set: React.Dispatch<React.SetStateAction<Dish[]>>) {
  set((prev) => prev.filter((d) => d.id !== id));
}
function updateDish(id: string, patch: Partial<Dish>, set: React.Dispatch<React.SetStateAction<Dish[]>>) {
  set((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topTitle: { fontSize: 20, fontWeight: "800", color: "#D73A2F" },

  stepper: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  stepIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stepLabel: { marginTop: 4, fontWeight: "800", color: "#B26B4B" },
  stepBar: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "#F5D7C8", marginTop: 8 },

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

  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)" },
  footerInner: { paddingHorizontal: 16, flexDirection: "row", gap: 12 },
  ghostBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  ghostText: { fontWeight: "800", color: "#6B6B6B" },
  cta: { flex: 2, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FF5630" },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});

/* ------------------------------------------------------------------ */
/* Mock REST (safe to delete when you wire your API)                   */
/* ------------------------------------------------------------------ */
async function mockApi<T>(path: string, _init?: RequestInit): Promise<any> {
  await new Promise((r) => setTimeout(r, 200));
  if (path.startsWith("/locations?search=")) {
    const q = decodeURIComponent(path.split("search=")[1] || "").toLowerCase();
    const all: LocationSuggestion[] = [
      { label: "Central Park", address: "Central Park, New York, NY 10024, USA", latitude: 40.7829, longitude: -73.9654 },
      { label: "Times Square", address: "Manhattan, NY 10036, USA", latitude: 40.758, longitude: -73.9855 },
      { label: "Brooklyn Bridge Park", address: "Brooklyn, NY 11201, USA", latitude: 40.7003, longitude: -73.9967 },
      { label: "Community Center", address: "123 Main St, Your City", latitude: 12.34, longitude: 56.78 },
    ];
    return all.filter((x) => x.label.toLowerCase().includes(q));
  }
  if (path === "/events" && _init?.method === "POST") {
    return { event: { id: `evt_${Date.now()}` } };
  }
  return { ok: true };
}
