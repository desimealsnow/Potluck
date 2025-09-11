import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import EventDetailsPage from "./EventDetailsPage";
import CreateEventScreen from "./CreateEvent";
import PlansScreen from "./PlansScreen";
import SettingsScreen from "./SettingsScreen";
import SubscriptionScreen from "./SubscriptionScreen";
import { apiClient } from "@/services/apiClient";
import { Input, Chip, Segmented } from "@/components";
import { formatDateTimeRange } from "@/utils/dateUtils";
import { gradients } from "@/theme";
import type { 
  Diet, 
  EventStatusMobile, 
  Ownership, 
  EventItem, 
  Attendee, 
  EventsQuery 
} from "@common/types";

// Constants
const PAGE_PADDING = 16;

/* --------------------- Config --------------------- */
const PAGE_SIZE = 10;

/* -------------------- API Helpers -------------------- */
async function fetchEvents(q: EventsQuery): Promise<{ items: EventItem[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  // backend expects limit/offset, not page
  params.set("limit", String(q.limit));
  params.set("offset", String((q.page - 1) * q.limit));
  if (q.q) params.set("q", q.q);
  if (q.status) {
    // Map mobile status to backend enum values
    const statusMap: Record<string, string> = {
      "upcoming": "published",
      "past": "completed",
      "drafts": "draft",
      "deleted": "purged",
    };
    params.set("status", statusMap[q.status] || q.status);
    
    // For drafts, always show only user's own drafts
    if (q.status === "drafts" || q.status === "deleted") {
      params.set("ownership", "mine");
    }
  }
  if (q.ownership && q.status !== "drafts") params.set("ownership", q.ownership);
  // backend expects meal_type instead of diet
  if (q.diet && q.diet.length) params.set("meal_type", q.diet.join(","));

  const data = await apiClient.get<any>(`/events?${params.toString()}`);
  
  // Backend returns { items, totalCount, nextOffset }
  const itemsRaw = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  const totalCount = typeof data.totalCount === 'number' ? data.totalCount : undefined;
  const nextOffset = data.nextOffset ?? null;
  const hasMore = nextOffset !== null || (typeof totalCount === 'number' ? (q.page * q.limit) < totalCount : itemsRaw.length === q.limit);

  const items: EventItem[] = itemsRaw.map((e: any) => {
    const ownershipFromApi = e.ownership as Ownership | undefined;
    return {
      id: e.id,
      title: e.title || e.name || "Untitled Event",
      date: e.event_date || e.date || new Date().toISOString(),
      time: undefined,
      venue: e.location?.label || e.venue || e.address || "",
      attendeeCount: e.attendeeCount ?? e.participants_count ?? 0,
      diet: (e.meal_type as Diet) || "mixed",
      statusBadge: e.status === "purged"
        ? "deleted"
        : e.status === "completed"
        ? "past"
        : e.status === "cancelled"
        ? "cancelled"
        : e.status === "draft"
        ? "draft"
        : "active",
      ownership: ownershipFromApi,
      actualStatus: e.status, // Store the actual backend status
      attendeesPreview: (e.attendees_preview || []).slice(0,3).map((p: any, idx: number) => ({
        id: p.id || String(idx),
        name: p.name || p.email || "Guest",
        avatarUrl: p.avatar_url || p.avatarUrl,
      })),
    };
  });

  return { items, hasMore };
}

// Cross-platform confirmation (web: window.confirm, native: Alert.alert)
function confirmAsync(
  title: string,
  message: string,
  confirmText: string,
  cancelText: string = "Cancel",
  destructive: boolean = false
): Promise<boolean> {
  if (Platform.OS === "web") {
    const ok = typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`);
    return Promise.resolve(!!ok);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ]
    );
  });
}

/* ---------------------- Screen ---------------------- */
export default function App() {
  const [statusTab, setStatusTab] = useState<EventStatusMobile>("upcoming");
  const [ownership, setOwnership] = useState<Ownership>("all");
  const [dietFilters, setDietFilters] = useState<Diet[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const debTimer = useRef<NodeJS.Timeout | null>(null);
  const endReachedOnce = useRef(false);
  
  // Navigation state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const pendingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const requestConfirmThenRun = useCallback(async (key: string, fn: () => Promise<void> | void) => {
    if (pendingActionKey !== key) {
      setPendingActionKey(key);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => setPendingActionKey(null), 3000);
      return;
    }
    setPendingActionKey(null);
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    await Promise.resolve(fn());
  }, [pendingActionKey]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  const bgGradient = useMemo(
    () => gradients.header.cool,
    []
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const res = await fetchEvents({
        page: 1,
        limit: PAGE_SIZE,
        q: query.trim() || undefined,
        status: statusTab,
        ownership,
        diet: dietFilters.length ? dietFilters : undefined,
      });
      setData(res.items);
      setHasMore(res.hasMore);
    } catch (e) {
      console.warn("Failed to fetch:", e);
      setData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [query, statusTab, ownership, dietFilters]);

  // Reload with explicit status tab (avoids stale fetch after switching tabs)
  const reloadWith = useCallback(async (nextTab: EventStatusMobile) => {
    setLoading(true);
    setPage(1);
    try {
      const res = await fetchEvents({
        page: 1,
        limit: PAGE_SIZE,
        q: query.trim() || undefined,
        status: nextTab,
        ownership,
        diet: dietFilters.length ? dietFilters : undefined,
      });
      setData(res.items);
      setHasMore(res.hasMore);
    } catch (e) {
      console.warn("Failed to fetch (reloadWith):", e);
      setData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [query, ownership, dietFilters]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetchEvents({
        page: next,
        limit: PAGE_SIZE,
        q: query.trim() || undefined,
        status: statusTab,
        ownership,
        diet: dietFilters.length ? dietFilters : undefined,
      });
      setData((d) => [...d, ...res.items]);
      setPage(next);
      setHasMore(res.hasMore);
    } catch (e) {
      console.warn("Load more error:", e);
    } finally {
      setLoading(false);
    }
  }, [page, query, statusTab, ownership, dietFilters, hasMore, loading]);

  // Debounce search input
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => reload(), 250);
    return () => {
      if (debTimer.current) clearTimeout(debTimer.current);
    };
  }, [query, statusTab, ownership, dietFilters, reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const toggleDiet = (d: Diet) =>
    setDietFilters((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  // Navigation functions
  const handleEventPress = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowEventDetails(true);
  };

  const handlePublishEvent = async (eventId: string) => {
    try {
      await apiClient.post(`/events/${eventId}/publish`);
      Alert.alert("🎉 Event Published!", "Your event is now live and visible to participants!");
      // Refresh the data to update the status
      reload();
    } catch (e: any) {
      console.error("Publish event error:", e);
      Alert.alert("Failed to publish", e?.message ?? "Unknown error");
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    console.log("=== EventList CANCEL EVENT START ===", eventId);
    try {
      console.log("Making API call to cancel event...");
      const response = await apiClient.post(`/events/${eventId}/cancel`, { reason: "Event cancelled by host" });
      console.log("Cancel API response:", response);
      Alert.alert("Event Cancelled", "Your event has been cancelled and participants have been notified.");
      reload();
    } catch (e: any) {
      console.error("Cancel event error:", e);
      Alert.alert("Failed to cancel", e?.message ?? "Unknown error");
    }
    console.log("=== EventList CANCEL EVENT END ===");
  };

  const handleCompleteEvent = async (eventId: string) => {
    console.log("=== EventList COMPLETE EVENT START ===", eventId);
    try {
      console.log("Attempting to complete event:", eventId);
      const response = await apiClient.post(`/events/${eventId}/complete`);
      console.log("Complete response:", response);
      Alert.alert("Event Completed", "Your event has been marked as completed!");
      reload();
    } catch (e: any) {
      console.error("Complete event error:", e);
      Alert.alert("Failed to complete", e?.message ?? "Unknown error");
    }
    console.log("=== EventList COMPLETE EVENT END ===");
  };

  const handlePurgeEvent = async (eventId: string) => {
    console.log("=== EventList PURGE EVENT START ===", eventId);
    try {
      console.log("Attempting to purge event:", eventId);
      const response = await apiClient.post(`/events/${eventId}/purge`);
      console.log("Purge response:", response);
      Alert.alert("Event Deleted", "Your event has been permanently deleted.");
      setStatusTab("deleted");
      reload();
    } catch (e: any) {
      console.error("Purge event error:", e);
      Alert.alert("Failed to delete", e?.message ?? "Unknown error");
    }
    console.log("=== EventList PURGE EVENT END ===");
  };

  const handleRestoreEvent = async (eventId: string) => {
    try {
      await apiClient.post(`/events/${eventId}/restore`);
      Alert.alert("Event Restored", "Your event has been restored successfully!");
      setStatusTab("drafts");
      reload();
    } catch (e: any) {
      console.error("Restore event error:", e);
      Alert.alert("Failed to restore", e?.message ?? "Unknown error");
    }
  };

  const handleBackToList = () => {
    setShowEventDetails(false);
    setSelectedEventId(null);
    // Refresh list after returning from details
    reload();
  };

  const handleCreateEvent = () => {
    setShowCreateEvent(true);
  };

  const handleEventCreated = (eventId: string) => {
    setShowCreateEvent(false);
    // Refresh the list to show the new event
    reload();
    // Optionally navigate to the newly created event
    setSelectedEventId(eventId);
    setShowEventDetails(true);
  };

  // Get available actions for an event based on status and ownership
  const getEventActions = (item: EventItem) => {
    if (!item.actualStatus) {
      console.log("EventList - No status:", { actualStatus: item.actualStatus, ownership: item.ownership });
      return [];
    }
    
    const status = item.actualStatus;
    // Show owner-only actions when we can confidently infer ownership
    // - If backend marks item as mine
    // - If user has selected ownership filter = mine
    // - Drafts and Deleted are always mine by construction
    const isOwner = (item.ownership === 'mine') || (ownership === 'mine') || (status === 'draft') || (status === 'purged');
    const actions = [];

    console.log("EventList - Event status and ownership:", { status, ownership: item.ownership ?? ownership, isOwner, itemId: item.id });

    if (isOwner) {
      switch (status) {
        case 'draft':
          actions.push({ key: 'publish', label: pendingActionKey === `publish:${item.id}` ? 'Tap again to confirm' : 'Publish', icon: 'rocket-outline', color: '#4CAF50', handler: () => requestConfirmThenRun(`publish:${item.id}`, () => handlePublishEvent(item.id)) });
          actions.push({ key: 'purge', label: pendingActionKey === `purge:${item.id}` ? 'Tap again to confirm' : 'Delete', icon: 'trash-outline', color: '#F44336', handler: () => requestConfirmThenRun(`purge:${item.id}`, () => handlePurgeEvent(item.id)) });
          break;
        case 'published':
          actions.push({ key: 'cancel', label: pendingActionKey === `cancel:${item.id}` ? 'Tap again to confirm' : 'Cancel', icon: 'close-circle-outline', color: '#FF9800', handler: () => requestConfirmThenRun(`cancel:${item.id}`, () => handleCancelEvent(item.id)) });
          actions.push({ key: 'complete', label: pendingActionKey === `complete:${item.id}` ? 'Tap again to confirm' : 'Complete', icon: 'checkmark-circle-outline', color: '#2196F3', handler: () => requestConfirmThenRun(`complete:${item.id}`, () => handleCompleteEvent(item.id)) });
          break;
        case 'completed':
          // Backend does not allow purging completed events; no actions
          break;
        case 'cancelled':
          actions.push({ key: 'purge', label: pendingActionKey === `purge:${item.id}` ? 'Tap again to confirm' : 'Delete', icon: 'trash-outline', color: '#F44336', handler: () => requestConfirmThenRun(`purge:${item.id}`, () => handlePurgeEvent(item.id)) });
          break;
        case 'purged':
          actions.push({ key: 'restore', label: pendingActionKey === `restore:${item.id}` ? 'Tap again to confirm' : 'Restore', icon: 'refresh-outline', color: '#9C27B0', handler: () => requestConfirmThenRun(`restore:${item.id}`, () => handleRestoreEvent(item.id)) });
          break;
      }
    }

    console.log("EventList - Available actions for", item.id, ":", actions);
    return actions;
  };

  const handleBackFromCreate = () => {
    setShowCreateEvent(false);
  };

  // Show SubscriptionScreen if subscription is selected
  if (showSubscription) {
    return (
      <SubscriptionScreen 
        onBack={() => setShowSubscription(false)}
      />
    );
  }

  // Show SettingsScreen if settings is selected
  if (showSettings) {
    return (
      <SettingsScreen 
        onBack={() => setShowSettings(false)}
        onShowSubscription={() => {
          setShowSettings(false);
          setShowSubscription(true);
        }}
      />
    );
  }

  // Show PlansScreen if plans is selected
  if (showPlans) {
    return (
      <PlansScreen 
        onBack={() => setShowPlans(false)}
      />
    );
  }

  // Show CreateEventScreen if create is selected
  if (showCreateEvent) {
    return (
      <CreateEventScreen 
        onEventCreated={handleEventCreated}
        onBack={handleBackFromCreate}
      />
    );
  }

  // Show EventDetailsPage if an event is selected
  if (showEventDetails && selectedEventId) {
    return (
      <EventDetailsPage 
        eventId={selectedEventId} 
        onBack={handleBackToList}
        onActionCompleted={(nextTab) => {
          setStatusTab(nextTab as EventStatusMobile);
          // Immediately fetch using the desired tab to avoid stale data
          reloadWith(nextTab as EventStatusMobile);
        }}
      />
    );
  }

  /* --------------- Render --------------- */
  return (
    <LinearGradient colors={bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
          <View style={styles.actions}>
            <Pressable onPress={handleCreateEvent} style={[styles.iconBtn, styles.iconBtnAlt]}>
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setShowPlans(true)} style={styles.iconBtn}>
              <Ionicons name="card" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setShowSettings(true)} style={styles.iconBtn}>
              <Ionicons name="settings" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert("Logout", "Logout functionality will be handled by the parent component")}
              style={styles.iconBtn}
            >
              <Ionicons name="log-out" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search events..."
            value={query}
            onChangeText={setQuery}
            leftIcon="search"
            style={styles.searchInput}
          />
        </View>

        {/* Segmented control */}
        <View style={styles.segmentWrap}>
          <Segmented
            options={[
              { key: "upcoming", label: "Upcoming" },
              { key: "drafts", label: "Drafts" },
              { key: "past", label: "Past" },
              { key: "deleted", label: "Deleted" },
            ]}
            value={statusTab}
            onChange={(v) => setStatusTab(v as EventStatusMobile)}
          />
        </View>

        {/* Ownership chips */}
        <View style={styles.rowChips}>
          {(["all", "mine", "invited"] as Ownership[]).map((o) => (
            <View style={styles.chipItem} key={o}>
              <Chip
                selected={ownership === o}
                onPress={() => setOwnership(o)}
                icon={o === "all" ? "options-outline" : o === "mine" ? "person" : "people-outline"}
                tone="sky"
              >
                {o === "all" ? "All" : o[0].toUpperCase() + o.slice(1)}
              </Chip>
            </View>
          ))}
        </View>

        {/* Diet chips (multi-select) */}
        <View style={[styles.rowChips, { marginTop: 6 }]}>
          {(["veg", "nonveg", "mixed"] as Diet[]).map((d) => (
            <View style={styles.chipItem} key={d}>
              <Chip
                selected={dietFilters.includes(d)}
                onPress={() => toggleDiet(d)}
                icon={d === "veg" ? "leaf" : d === "nonveg" ? "fast-food-outline" : "color-filter-outline"}
                tone="emerald"
              >
                {d === "veg" ? "Veg" : d === "nonveg" ? "Non-veg" : "Mixed"}
              </Chip>
            </View>
          ))}
        </View>
        </View>

        {/* List */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={{ marginTop: 10 }}
          refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={{ color: "#fff" }}>No events found</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <EventCard 
              item={item} 
              onPress={() => handleEventPress(item.id)} 
              actions={getEventActions(item)}
            />
          )}
          onEndReachedThreshold={0.01}
          onEndReached={() => {
            if (!endReachedOnce.current) {
              endReachedOnce.current = true;
              return;
            }
            loadMore();
          }}
          ListFooterComponent={loading && data.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color="#fff" /> : null}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ------------------ Components ------------------ */

function DietTag({ diet }: { diet: Diet }) {
  const map = {
    veg: { bg: "rgba(74,222,128,0.95)", fg: "#0B3D1E", label: "veg" },
    nonveg: { bg: "rgba(251,146,60,0.95)", fg: "#4A1D00", label: "non-veg" },
    mixed: { bg: "rgba(250,204,21,0.95)", fg: "#3F2D00", label: "mixed" },
  } as const;
  const d = map[diet];
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: d.bg }}>
      <Text style={{ color: d.fg, fontWeight: "700", fontSize: 12 }}>{d.label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: "active" | "cancelled" | "draft" | "deleted" | "past" }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { color: "rgba(16,185,129,0.95)", icon: "checkmark-circle", textColor: "#0b3d2a" };
      case "cancelled":
        return { color: "rgba(239,68,68,0.95)", icon: "close-circle", textColor: "#7f1d1d" };
      case "draft":
        return { color: "rgba(251,191,36,0.95)", icon: "create-outline", textColor: "#78350f" };
      case "deleted":
        return { color: "rgba(107,114,128,0.95)", icon: "trash-outline", textColor: "#111827" };
      case "past":
        return { color: "rgba(59,130,246,0.95)", icon: "time-outline", textColor: "#1e3a8a" };
      default:
        return { color: "rgba(16,185,129,0.95)", icon: "checkmark-circle", textColor: "#0b3d2a" };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <View
      style={
        {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 16,
          backgroundColor: config.color,
        }
      }
    >
      <Ionicons
        name={config.icon as any}
        size={14}
        color="#fff"
        style={{ marginRight: 4 }}
      />
      <Text style={{ fontSize: 12, fontWeight: "700", color: config.textColor, marginLeft: 6 }}>{status}</Text>
    </View>
  );
}

function RolePill({ role }: { role: 'host' | 'guest' }) {
  const config = role === 'host'
    ? { bg: 'rgba(236,72,153,0.95)', fg: '#3f0a24', icon: 'person' }
    : { bg: 'rgba(59,130,246,0.95)', fg: '#10284c', icon: 'people-outline' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, backgroundColor: config.bg }}>
      <Ionicons name={config.icon as any} size={12} color="#fff" />
      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: config.fg }}>{role}</Text>
    </View>
  );
}

function Avatars({ people, extra }: { people: Attendee[]; extra?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {people.slice(0, 3).map((p, idx) => (
        <View key={p.id} style={[styles.avatarWrap, { marginLeft: idx === 0 ? 0 : -10 }]}>
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="person" size={14} color="#fff" />
            </View>
          )}
        </View>
      ))}
      {extra && extra > 0 ? (
        <View style={[styles.avatarWrap, { marginLeft: -10, backgroundColor: "rgba(255,255,255,0.25)" }]}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

function EventCard({ 
  item, 
  onPress, 
  actions = [] 
}: { 
  item: EventItem; 
  onPress: () => void; 
  actions?: Array<{
    key: string;
    label: string;
    icon: string;
    color: string;
    handler: () => void;
  }>;
}) {
  const dateLabel = formatDateTimeRange(new Date(item.date), item.time ? new Date(item.time) : undefined);
  const cardColors = gradients.card.pink;
  const roleLabel = item.ownership === 'mine' ? 'host' : 'guest';
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 6 }}>
            <RolePill role={roleLabel} />
          </View>
          {item.statusBadge ? <StatusPill status={item.statusBadge} /> : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-clear-outline" size={16} color="#EAF2FF" style={{ marginRight: 8 }} />
        <Text style={styles.metaText}>{dateLabel}</Text>
      </View>

      <View style={[styles.metaRow, { marginTop: 4 }]}>
        <Ionicons name="location-outline" size={16} color="#EAF2FF" style={{ marginRight: 8 }} />
        <Text style={styles.metaText}>{item.venue}</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Ionicons name="people-outline" size={16} color="#EAF2FF" />
          <Text style={[styles.metaText, { marginLeft: 6 }]}>{item.attendeeCount}</Text>
        </View>

        <View style={styles.footerCenter}>
          <DietTag diet={item.diet} />
        </View>

        <View style={styles.footerRight}>
          <Avatars
            people={item.attendeesPreview || []}
            extra={Math.max(0, (item.attendeeCount || 0) - (item.attendeesPreview?.length || 0))}
          />
        </View>
      </View>

      {/* Action buttons based on event status and ownership */}
      {actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {actions.map((action) => (
            <Pressable 
              key={action.key}
              onPress={(e) => {
                e.stopPropagation(); // Prevent triggering the card press
                console.log("EventList - Action button pressed:", action.key, action.label, "for event:", item.id);
                action.handler();
              }}
              style={[styles.actionButton, { backgroundColor: action.color }]}
            >
              <Ionicons name={action.icon as any} size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      </LinearGradient>
    </Pressable>
  );
}

/* ------------------- Utilities ------------------- */

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
  // Centered column for top controls on large screens (web) while keeping padding
  content: {
    paddingHorizontal: PAGE_PADDING,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },

  // NEW – replaces `gap` usage for reliability
  actions: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    marginLeft: 8,
  },
  iconBtnAlt: { backgroundColor: "rgba(255,255,255,0.25)" },

  searchWrap: {
    marginTop: 10,
    marginHorizontal: 0,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { marginLeft: 8, flex: 1, color: "#fff", fontSize: 15 },

  // NEW – aligns segmented with everything else
  segmentWrap: { paddingHorizontal: 0, marginTop: 10 },

  // UPDATED – wrap + consistent gutters
  rowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 0,
    marginTop: 8,
  },
  // NEW – apply spacing per chip without relying on child internals
  chipItem: { marginRight: 8, marginBottom: 8 },

  card: {
    borderRadius: 18,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 6 },
    }),
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800", flex: 1, paddingRight: 12 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  metaText: { color: "#EAF2FF", fontSize: 14, fontWeight: "600" },

  // UPDATED – fixed 3-zone footer so center never drifts
  footerRow: { marginTop: 14, flexDirection: "row", alignItems: "center" },
  footerLeft: { flexDirection: "row", alignItems: "center", minWidth: 64 },
  footerCenter: { flex: 1, alignItems: "center" },
  footerRight: { minWidth: 86, alignItems: "flex-end" },

  avatarWrap: {
    width: 28, height: 28, borderRadius: 14, overflow: "hidden",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  avatar: { width: "100%", height: "100%", borderRadius: 14 },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },

  // Standardized list padding
  listContent: { paddingHorizontal: PAGE_PADDING, paddingBottom: 24 },

  // Action buttons styles
  actionsContainer: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
    minWidth: 80,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
