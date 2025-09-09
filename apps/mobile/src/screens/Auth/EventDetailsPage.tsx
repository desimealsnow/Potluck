import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ParticipantsScreen from "./Participants";
import { supabase } from "../../config/supabaseClient";

/* ===================== Config ===================== */
const API_BASE_URL = "http://localhost:3000/api/v1"; // In React Native, use expo-constants for env vars
const USE_MOCK = false; // set to false when your REST is ready
const EVENT_ID = "evt_123";

/* ===================== Types ===================== */
type EventDTO = {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  location: string;
  perks: string[];
  attendingCount: number;
  host: { name: string; role: string; avatar?: string };
  details: { intro: string; bring: string; backup: string };
};

type ItemDTO = {
  id: string;
  name: string;
  requiredQty: number;
  claimedQty: number;
  perGuest?: boolean;
};

type ParticipantDTO = {
  id: string;
  name: string;
  avatar?: string;
  role?: "host";
  status: "attending" | "pending" | "declined";
};


/* ===================== API helper ===================== */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCK) return mockApi<T>(path, init);
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ===================== Data hook ===================== */
function useEventData(eventId: string) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [event, setEvent] = useState<EventDTO | null>(null);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [participants, setParticipants] = useState<ParticipantDTO[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [e, it, p] = await Promise.all([
        api<any>(`/events/${eventId}`),
        api<ItemDTO[]>(`/events/${eventId}/items`),
        api<ParticipantDTO[]>(`/events/${eventId}/participants`),
      ]);
      // Map backend EventFull to local EventDTO shape
      const mappedEvent: EventDTO | null = e && e.event ? {
        id: e.event.id,
        title: e.event.title,
        start: e.event.event_date,
        end: e.event.event_date,
        location: e.event.location?.name || e.event.location?.formatted_address || '',
        perks: [],
        attendingCount: e.event.attendee_count ?? 0,
        host: { name: '', role: 'host' },
        details: { intro: '', bring: '', backup: '' },
      } : null;
      setEvent(mappedEvent);
      console.log("Items data:", it, "Type:", typeof it, "Is Array:", Array.isArray(it));
      setItems(Array.isArray(it) ? it : []);
      setParticipants(Array.isArray(p) ? p : []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, refreshing, error, event, items, participants, refresh, setItems };
}

/* ===================== Page ===================== */
type Tab = "overview" | "items" | "participants";

export default function EventDetailsPage({ 
  eventId = EVENT_ID, 
  onBack 
}: { 
  eventId?: string; 
  onBack?: () => void; 
}) {
  const [active, setActive] = useState<Tab>("overview");
  const { loading, refreshing, event, items, participants, refresh, setItems } = useEventData(eventId);

  const gradient = useMemo(
    () => ["#ddd6fe", "#e9d5ff", "#fce7f3"] as const,
    []
  );

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TopBar title="" onBack={onBack} onRefresh={refresh} />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <EventHeader isLoading={loading} event={event || undefined} />
          </View>

          <TabsBar active={active} onChange={setActive} />

          <View style={styles.contentContainer}>
            {active === "overview" && (
              <OverviewTab isLoading={loading || refreshing} event={event} />
            )}
            {active === "items" && (
              <ItemsTab
                isLoading={loading || refreshing}
                items={items}
                onClaim={async (id) => {
                  await api(`/events/${eventId}/items/${id}/claim`, { method: "POST" });
                  refresh();
                }}
                onUnclaim={async (id) => {
                  await api(`/events/${eventId}/items/${id}/unclaim`, { method: "POST" });
                  refresh();
                }}
                // local optimistic helpers
                setItems={setItems}
              />
            )}
            {active === "participants" && (
              <View style={{ flex: 1 }}>
                <ParticipantsScreen 
                  eventId={eventId} 
                  showHeader={false}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ===================== Top bar ===================== */
function TopBar({
  title,
  onBack,
  onRefresh,
}: {
  title?: string;
  onBack?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} style={styles.topBarButton}>
        <Ionicons name="arrow-back" size={20} color="#374151" />
      </Pressable>
      {title ? (
        <Text style={styles.topBarTitle}>{title}</Text>
      ) : (
        <View style={styles.topBarSpacer} />
      )}
      <View style={styles.topBarActions}>
        <Pressable onPress={onRefresh} style={styles.topBarButton}>
          <Ionicons name="refresh" size={20} color="#374151" />
        </Pressable>
        <Pressable style={styles.topBarButton}>
          <Ionicons name="share-outline" size={20} color="#374151" />
        </Pressable>
        <Pressable style={styles.topBarButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#374151" />
        </Pressable>
      </View>
    </View>
  );
}

/* ===================== Header ===================== */
function EventHeader({
  isLoading,
  event,
}: {
  isLoading?: boolean;
  event?: EventDTO;
}) {
  if (isLoading || !event) return <HeaderSkeleton />;

  return (
    <View style={styles.eventHeader}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDate}>
        {formatDateRange(event.start, event.end)}
      </Text>
      <View style={styles.chipContainer}>
        <Chip icon="location-outline" tone="sky">{String((event as any).location ?? '')}</Chip>
        {(event.perks ?? []).map((p) => (
          <Chip key={p} icon="restaurant-outline" tone="emerald">{p}</Chip>
        ))}
        <Chip icon="people-outline" tone="violet">{event.attendingCount} attending</Chip>
      </View>
    </View>
  );
}

function HeaderSkeleton() {
  return (
    <View style={[styles.eventHeader, styles.skeleton]}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonDate} />
      <View style={styles.chipContainer}>
        <View style={styles.skeletonChip} />
        <View style={styles.skeletonChip} />
        <View style={styles.skeletonChip} />
      </View>
    </View>
  );
}

/* ===================== Tabs bar ===================== */
function TabsBar({
  active, onChange,
}: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Items" },
    { key: "participants", label: "Participants" },
  ];
  return (
    <View style={styles.tabsContainer}>
      <View style={styles.tabsRow}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[
              styles.tabButton,
              active === t.key && styles.tabButtonActive
            ]}
          >
            <Text style={[
              styles.tabText,
              active === t.key && styles.tabTextActive
            ]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ===================== Overview tab ===================== */
function OverviewTab({
  isLoading,
  event,
}: { isLoading?: boolean; event?: EventDTO | null }) {
  const [rsvp, setRsvp] =
    useState<"accepted" | "declined" | "none">("none");

  if (isLoading || !event) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* RSVP */}
      <Card>
        <Text style={styles.sectionTitle}>RSVP</Text>
        <View style={styles.rsvpButtons}>
          <Pressable
            onPress={() => setRsvp("accepted")}
            style={[
              styles.rsvpButton,
              rsvp === "accepted" ? styles.rsvpButtonAccepted : styles.rsvpButtonAcceptedInactive
            ]}
          >
            <Ionicons name="checkmark" size={16} color={rsvp === "accepted" ? "#ffffff" : "#166534"} />
            <Text style={[
              styles.rsvpButtonText,
              rsvp === "accepted" ? styles.rsvpButtonTextAccepted : styles.rsvpButtonTextAcceptedInactive
            ]}>Accept</Text>
          </Pressable>
          <Pressable
            onPress={() => setRsvp("declined")}
            style={[
              styles.rsvpButton,
              rsvp === "declined" ? styles.rsvpButtonDeclined : styles.rsvpButtonDeclinedInactive
            ]}
          >
            <Ionicons name="close" size={16} color={rsvp === "declined" ? "#ffffff" : "#dc2626"} />
            <Text style={[
              styles.rsvpButtonText,
              rsvp === "declined" ? styles.rsvpButtonTextDeclined : styles.rsvpButtonTextDeclinedInactive
            ]}>Decline</Text>
          </Pressable>
        </View>
      </Card>

      {/* Notes */}
      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={styles.emoji}>💬</Text>
          </View>
          <Text style={styles.sectionTitle}>Notes</Text>
        </View>
        <TextInput
          placeholder="Add any notes or special requirements..."
          multiline
          numberOfLines={3}
          style={styles.textInput}
          textAlignVertical="top"
        />
      </Card>

      {/* Host */}
      <Card>
        <Text style={styles.sectionTitle}>Event Host</Text>
        <View style={styles.hostContainer}>
          <Avatar name={event.host.name} src={event.host.avatar} />
          <View style={styles.hostInfo}>
            <Text style={styles.hostName}>{event.host.name}</Text>
            <Text style={styles.hostRole}>{event.host.role}</Text>
          </View>
        </View>
      </Card>

      {/* Details */}
      <Card>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <Text style={styles.eventIntro}>{event.details.intro}</Text>
        <Text style={styles.eventDetail}>
          <Text style={styles.eventDetailLabel}>What to bring:</Text> {event.details.bring}
        </Text>
        <Text style={styles.eventDetail}>
          <Text style={styles.eventDetailLabel}>Weather backup:</Text> {event.details.backup}
        </Text>
      </Card>
    </View>
  );
}

/* ===================== Items tab ===================== */
function ItemsTab({
  isLoading,
  items,
  onClaim,
  onUnclaim,
  setItems,
}: {
  isLoading?: boolean;
  items: ItemDTO[];
  onClaim: (id: string) => Promise<void>;
  onUnclaim: (id: string) => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<ItemDTO[]>>;
}) {
  // Safety check to ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  const handleClaim = async (id: string) => {
    // optimistic
    setItems((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map((it) =>
        it.id === id ? { ...it, claimedQty: Math.min(it.claimedQty + 1, it.requiredQty) } : it
      );
    });
    await onClaim(id);
  };

  console.log("ItemsTab - items:", items, "safeItems:", safeItems, "isLoading:", isLoading);
  
  return (
    <View style={styles.tabContent}>
      {safeItems.map((it) => {
        const pct = clamp01(it.claimedQty / it.requiredQty);
        const complete = it.claimedQty >= it.requiredQty;
        return (
          <Card key={it.id}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{it.name}</Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemCount}>
                    {it.claimedQty} / {it.requiredQty} items
                  </Text>
                  {it.perGuest && (
                    <View style={styles.perGuestTag}>
                      <Text style={styles.perGuestText}>Per guest</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                disabled={complete}
                onPress={() => handleClaim(it.id)}
                style={[
                  styles.claimButton,
                  complete ? styles.claimButtonComplete : styles.claimButtonActive
                ]}
              >
                {complete ? (
                  <>
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text style={styles.claimButtonTextComplete}>Claimed</Text>
                  </>
                ) : (
                  <Text style={styles.claimButtonText}>+ Claim</Text>
                )}
              </Pressable>
            </View>
            <Progress value={pct} />
            {complete && (
              <Text style={styles.completeText}>✓ Complete</Text>
            )}
          </Card>
        );
      })}
    </View>
  );
}

/* ===================== Participants tab - Now using ParticipantsScreen component ===================== */


/* ===================== Atoms / utilities ===================== */
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Chip({
  children,
  icon,
  tone = "sky",
}: {
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "sky" | "emerald" | "violet";
}) {
  const toneStyles = {
    sky: styles.chipSky,
    emerald: styles.chipEmerald,
    violet: styles.chipViolet,
  };
  const textStyles = {
    sky: styles.chipTextSky,
    emerald: styles.chipTextEmerald,
    violet: styles.chipTextViolet,
  };
  
  return (
    <View style={[styles.chip, toneStyles[tone]]}>
      {icon && <Ionicons name={icon} size={12} color={textStyles[tone].color} style={styles.chipIcon} />}
      <Text style={[styles.chipText, textStyles[tone]]}>{children}</Text>
    </View>
  );
}

function Pill({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "rose" | "indigo";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const toneStyles = {
    green: styles.pillGreen,
    amber: styles.pillAmber,
    rose: styles.pillRose,
    indigo: styles.pillIndigo,
  };
  const textStyles = {
    green: styles.pillTextGreen,
    amber: styles.pillTextAmber,
    rose: styles.pillTextRose,
    indigo: styles.pillTextIndigo,
  };
  
  return (
    <View style={[styles.pill, toneStyles[tone]]}>
      {icon && <Ionicons name={icon} size={12} color={textStyles[tone].color} style={styles.pillIcon} />}
      <Text style={[styles.pillText, textStyles[tone]]}>{children}</Text>
    </View>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <View style={styles.progressContainer}>
      <View 
        style={[
          styles.progressBar, 
          { width: `${Math.min(100, Math.max(0, value * 100))}%` }
        ]} 
      />
    </View>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name.split(" ").map(s => s[0]?.toUpperCase() || "").slice(0,2).join("");
  return src ? (
    <Image source={{ uri: src }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{initials || "?"}</Text>
    </View>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLeft}>{left}</Text>
      <Text style={styles.rowRight}>{right}</Text>
    </View>
  );
}

function formatDateRange(startISO: string, endISO: string) {
  const s = new Date(startISO), e = new Date(endISO);
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const st = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const et = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${st} - ${et}`;
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function sentence(s: string) { return s.slice(0,1).toUpperCase() + s.slice(1); }
function sum(list: { amount: number }[]) { return list.reduce((a, b) => a + b.amount, 0); }

/* ===================== Mock API ===================== */
async function mockApi<T>(path: string, _init?: RequestInit): Promise<any> {
  await new Promise((r) => setTimeout(r, 200));
  
  // Handle different event IDs
  const eventIdMatch = path.match(/\/events\/([^\/]+)$/);
  if (eventIdMatch) {
    const eventId = eventIdMatch[1];
    
    const mockEvents: { [key: string]: EventDTO } = {
      "evt_123": {
        id: "evt_123",
        title: "Team Building Retreat",
        start: new Date("2024-12-16T10:00:00").toISOString(),
        end: new Date("2024-12-16T18:00:00").toISOString(),
        location: "Central Park",
        perks: ["Lunch Included"],
        attendingCount: 24,
        host: { name: "Sarah Johnson", role: "Event Coordinator", avatar: "https://i.pravatar.cc/100?img=12" },
        details: {
          intro: "Join us for an exciting team building retreat at Central Park! We'll have various activities, team challenges, and a catered lunch.",
          bring: "Comfortable clothes, water bottle, and positive attitude!",
          backup: "Indoor activities available at nearby community center.",
        },
      },
      "evt_456": {
        id: "evt_456",
        title: "Holiday Potluck Dinner",
        start: new Date("2024-12-20T18:00:00").toISOString(),
        end: new Date("2024-12-20T22:00:00").toISOString(),
        location: "Community Center",
        perks: ["Vegetarian Options", "Live Music"],
        attendingCount: 18,
        host: { name: "Maria Garcia", role: "Community Organizer", avatar: "https://i.pravatar.cc/100?img=25" },
        details: {
          intro: "Join us for a festive holiday potluck dinner with friends and neighbors. Bring your favorite dish to share!",
          bring: "Your favorite holiday dish and good vibes!",
          backup: "Indoor dining area with heating available.",
        },
      },
      "evt_789": {
        id: "evt_789",
        title: "Weekend BBQ Party",
        start: new Date("2024-12-22T15:30:00").toISOString(),
        end: new Date("2024-12-22T20:00:00").toISOString(),
        location: "Riverside Park",
        perks: ["BBQ Grills", "Games"],
        attendingCount: 32,
        host: { name: "David Kim", role: "Event Host", avatar: "https://i.pravatar.cc/100?img=5" },
        details: {
          intro: "Come join us for a fun weekend BBQ party by the river! We'll have grills, games, and great company.",
          bring: "Meat for grilling, sides, or drinks to share!",
          backup: "Covered pavilion available in case of rain.",
        },
      },
      "evt_101": {
        id: "evt_101",
        title: "New Year Celebration",
        start: new Date("2024-12-31T20:00:00").toISOString(),
        end: new Date("2025-01-01T02:00:00").toISOString(),
        location: "Downtown Rooftop",
        perks: ["Fireworks View", "DJ", "Open Bar"],
        attendingCount: 45,
        host: { name: "Alex Rodriguez", role: "Party Planner", avatar: "https://i.pravatar.cc/100?img=33" },
        details: {
          intro: "Ring in the New Year with style! Join us on the rooftop for an unforgettable celebration with amazing city views.",
          bring: "Just yourself and party spirit! Everything else is provided.",
          backup: "Indoor party space with full bar and entertainment.",
        },
      }
    };
    
    const eventData = mockEvents[eventId];
    if (eventData) {
      return eventData;
    }
    
    // Fallback for unknown event IDs
    return mockEvents["evt_123"];
  }
  if (path.endsWith(`/events/${EVENT_ID}/items`)) {
    const items: ItemDTO[] = [
      { id: "i1", name: "Folding Chairs", requiredQty: 30, claimedQty: 18 },
      { id: "i2", name: "Water Bottles", requiredQty: 24, claimedQty: 24, perGuest: true },
      { id: "i3", name: "Sunscreen", requiredQty: 5, claimedQty: 2 },
      { id: "i4", name: "Bluetooth Speaker", requiredQty: 2, claimedQty: 1 },
      { id: "i5", name: "First Aid Kit", requiredQty: 1, claimedQty: 0 },
    ];
    return items;
  }
  if (path.endsWith(`/events/${EVENT_ID}/participants`)) {
    const ppl: ParticipantDTO[] = [
      { id: "p1", name: "Sarah Johnson", avatar: "https://i.pravatar.cc/100?img=12", role: "host", status: "attending" },
      { id: "p2", name: "Mike Chen", avatar: "https://i.pravatar.cc/100?img=64", status: "attending" },
      { id: "p3", name: "Emily Davis", avatar: "https://i.pravatar.cc/100?img=47", status: "attending" },
      { id: "p4", name: "James Wilson", avatar: "https://i.pravatar.cc/100?img=15", status: "pending" },
      { id: "p5", name: "Lisa Brown", avatar: "https://i.pravatar.cc/100?img=21", status: "declined" },
      { id: "p6", name: "Alex Rodriguez", avatar: "https://i.pravatar.cc/100?img=33", status: "attending" },
      { id: "p7", name: "Jessica Taylor", status: "pending" },
      { id: "p8", name: "David Kim", avatar: "https://i.pravatar.cc/100?img=5", status: "attending" },
    ];
    return ppl;
  }
  // actions
  if (path.includes(`/items/`) && path.endsWith(`/claim`)) return { ok: true };
  if (path.includes(`/items/`) && path.endsWith(`/unclaim`)) return { ok: true };
  return { ok: true };
}

/* ===================== Styles ===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  topBarButton: {
    padding: 8,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  topBarSpacer: {
    flex: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventHeader: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  eventDate: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipContainer: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skeleton: {
    // Add skeleton animation styles if needed
  },
  skeletonTitle: {
    height: 20,
    width: '75%',
    backgroundColor: 'rgba(209, 213, 219, 0.7)',
    borderRadius: 4,
  },
  skeletonDate: {
    marginTop: 12,
    height: 16,
    width: '50%',
    backgroundColor: 'rgba(209, 213, 219, 0.7)',
    borderRadius: 4,
  },
  skeletonChip: {
    height: 24,
    width: 80,
    backgroundColor: 'rgba(209, 213, 219, 0.7)',
    borderRadius: 12,
  },
  tabsContainer: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: -1,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#2563eb',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipSky: { backgroundColor: '#e0f2fe' },
  chipEmerald: { backgroundColor: '#d1fae5' },
  chipViolet: { backgroundColor: '#ede9fe' },
  chipTextSky: { color: '#0c4a6e' },
  chipTextEmerald: { color: '#065f46' },
  chipTextViolet: { color: '#5b21b6' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillGreen: { backgroundColor: '#dcfce7' },
  pillAmber: { backgroundColor: '#fef3c7' },
  pillRose: { backgroundColor: '#fce7f3' },
  pillIndigo: { backgroundColor: '#e0e7ff' },
  pillTextGreen: { color: '#166534' },
  pillTextAmber: { color: '#92400e' },
  pillTextRose: { color: '#9d174d' },
  pillTextIndigo: { color: '#3730a3' },
  progressContainer: {
    marginTop: 12,
    height: 8,
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  rowLeft: {
    fontSize: 14,
    color: '#374151',
  },
  rowRight: {
    fontSize: 14,
    color: '#111827',
  },
  // Tab content styles
  tabContent: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emoji: {
    fontSize: 12,
  },
  // RSVP styles
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  rsvpButtonAccepted: {
    backgroundColor: '#16a34a',
    borderColor: 'transparent',
  },
  rsvpButtonAcceptedInactive: {
    backgroundColor: '#f0fdf4',
    borderColor: 'rgba(22, 163, 74, 0.4)',
  },
  rsvpButtonDeclined: {
    backgroundColor: '#dc2626',
    borderColor: 'transparent',
  },
  rsvpButtonDeclinedInactive: {
    backgroundColor: '#fef2f2',
    borderColor: 'rgba(220, 38, 38, 0.4)',
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rsvpButtonTextAccepted: {
    color: '#ffffff',
  },
  rsvpButtonTextAcceptedInactive: {
    color: '#166534',
  },
  rsvpButtonTextDeclined: {
    color: '#ffffff',
  },
  rsvpButtonTextDeclinedInactive: {
    color: '#dc2626',
  },
  // Text input styles
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  // Host styles
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  hostRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Event details styles
  eventIntro: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  eventDetail: {
    fontSize: 14,
    color: '#374151',
    marginTop: 12,
    lineHeight: 20,
  },
  eventDetailLabel: {
    fontWeight: '700',
  },
  // Items tab styles
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  perGuestTag: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  perGuestText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  claimButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  claimButtonComplete: {
    backgroundColor: '#16a34a',
    borderColor: 'transparent',
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  claimButtonTextComplete: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  completeText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  // Participants tab styles
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    marginLeft: 'auto',
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  participantCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
