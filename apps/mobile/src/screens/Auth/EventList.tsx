import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  useWindowDimensions,
  Animated,
} from "react-native";
import { Image } from 'expo-image';
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/ui/Icon";
import EventDetailsPage from "./EventDetailsPage";
import CreateEventScreen from "./CreateEvent";
import PlansScreen from "./PlansScreen";
import SettingsScreen from "./SettingsScreen";
import NotificationsScreen from "./NotificationsScreen";
import UserPreferencesScreen from "./UserPreferencesScreen";
import SubscriptionScreen from "./SubscriptionScreen";
import AboutScreen from "./AboutScreen";
import PrivacyScreen from "./PrivacyScreen";
import HelpScreen from "./HelpScreen";
import { apiClient } from "@/services/apiClient";
import { Input, Chip, FilterChip, FilterBottomSheet, FilterSidebar, AppliedFiltersBar, Segmented } from "@/components";
import { formatDateTimeRange } from "@/utils/dateUtils";
import { gradients } from "@/theme";
import * as Notifications from 'expo-notifications';
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
async function fetchEvents(q: EventsQuery & { nearby?: { lat: number; lon: number; radius_km?: number } | null }): Promise<{ items: EventItem[]; hasMore: boolean }> {
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

  // Nearby filter → include is_public and lat/lon, and prefer published discovery
  if (q.nearby?.lat && q.nearby?.lon) {
    params.set('is_public', 'true');
    params.set('lat', String(q.nearby.lat));
    params.set('lon', String(q.nearby.lon));
    if (q.nearby.radius_km) params.set('radius_km', String(q.nearby.radius_km));
    // Force discovery of active public events when Nearby is on
    params.set('status', 'published');
    params.set('ownership', 'all');
  }

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
interface EventListProps {
  userLocation?: { lat: number; lon: number; radius_km: number } | null;
}

export default function EventList({ userLocation: propUserLocation }: EventListProps = {}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isMobile = width < 768;
  const [sidebarVisible, setSidebarVisible] = useState(true); // For web/tablet sidebar
  const sidebarTranslateX = useRef(new Animated.Value(0)).current; // 0 = visible, -280 = hidden
  
  // Animate sidebar visibility
  useEffect(() => {
    if (isTablet) {
      Animated.timing(sidebarTranslateX, {
        toValue: sidebarVisible ? 0 : -280,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [sidebarVisible, isTablet, sidebarTranslateX]);
  
  const [statusTab, setStatusTab] = useState<EventStatusMobile>("upcoming");
  const [ownership, setOwnership] = useState<Ownership>("all");
  const [dietFilters, setDietFilters] = useState<Diet[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [data, setData] = useState<EventItem[]>([]);
  const [useNearby, setUseNearby] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; radius_km: number } | null>(propUserLocation || null);
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [navigationContext, setNavigationContext] = useState<string | null>(null);
  const refreshUserLocation = useCallback(async () => {
    try {
      const response = await apiClient.get('/user-profile/me') as any;
      if (response?.latitude && response?.longitude) {
        setUserLocation({
          lat: Number(response.latitude),
          lon: Number(response.longitude),
          radius_km: Number(response.discoverability_radius_km || 10)
        });
      } else if (response?.city) {
        // keep previous until SupabaseAuthUI geocodes; don't clear to avoid flicker
        console.log('UserLocation updated city only; waiting for coords');
      }
    } catch (e) {
      console.log('refreshUserLocation failed:', e);
    }
  }, []);

  const bgGradient = useMemo(
    () => gradients.header.event,
    []
  );

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiClient.get<{ count: number }>(`/discovery/notifications/unread-count`);
      setUnreadCount(typeof data?.count === 'number' ? data.count : 0);
    } catch (e) {
      // ignore
    }
  }, []);

  // Register push token with server (best-effort)
  const registerPush = useCallback(async () => {
    try {
      const perms = await Notifications.getPermissionsAsync();
      if (!perms.granted) {
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) return;
      }
      const expo = await Notifications.getExpoPushTokenAsync();
      const token = expo?.data;
      if (!token) return;
      const platform = (Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web') as 'ios' | 'android' | 'web';
      await apiClient.post(`/discovery/push/register`, { platform, token });
    } catch (e) {
      // ignore
    }
  }, []);

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
        nearby: useNearby && userLocation ? userLocation : null,
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
  }, [query, statusTab, ownership, dietFilters, useNearby, userLocation]);

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
        nearby: useNearby && userLocation ? userLocation : null,
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
  }, [query, ownership, dietFilters, useNearby, userLocation]);

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
        nearby: useNearby && userLocation ? userLocation : null,
      });
      setData((d) => [...d, ...res.items]);
      setPage(next);
      setHasMore(res.hasMore);
    } catch (e) {
      console.warn("Load more error:", e);
    } finally {
      setLoading(false);
    }
  }, [page, query, statusTab, ownership, dietFilters, hasMore, loading, useNearby, userLocation]);

  // Debounce search input
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      console.log("Search triggered with query:", query);
      reload();
    }, 300);
    return () => {
      if (debTimer.current) clearTimeout(debTimer.current);
    };
  }, [query, statusTab, ownership, dietFilters, useNearby, reload]);

  // Update userLocation when prop changes
  useEffect(() => {
    if (propUserLocation) {
      setUserLocation(propUserLocation);
    }
  }, [propUserLocation]);

  // Load unread count initially and when coming back from notifications
  useEffect(() => {
    fetchUnreadCount();
    registerPush();
  }, [fetchUnreadCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const toggleDiet = (d: Diet) =>
    setDietFilters((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleRemoveFilter = useCallback((filterType: string, value?: string) => {
    if (filterType === 'ownership') {
      setOwnership('all');
    } else if (filterType === 'nearby') {
      setUseNearby(false);
    } else if (filterType === 'diet' && value) {
      setDietFilters(prev => prev.filter(d => d !== value));
    }
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (ownership !== 'all') count++;
    if (dietFilters.length > 0) count++;
    if (useNearby) count++;
    return count;
  }, [ownership, dietFilters, useNearby]);

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

  const handleBackNavigation = (pageName: string) => {
    // Close the current page
    switch (pageName) {
      case 'preferences':
        setShowPreferences(false);
        // Pull latest profile so Nearby reflects immediately after saving
        refreshUserLocation();
        break;
      case 'subscription':
        setShowSubscription(false);
        break;
      case 'about':
        setShowAbout(false);
        break;
      case 'privacy':
        setShowPrivacy(false);
        break;
      case 'help':
        setShowHelp(false);
        break;
    }
    
    // If we came from settings, go back to settings
    if (navigationContext === 'settings') {
      setShowSettings(true);
      setNavigationContext(null);
    }
  };

  // Show SubscriptionScreen if subscription is selected
  if (showSubscription) {
    return (
      <SubscriptionScreen 
        onBack={() => handleBackNavigation('subscription')}
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
          setNavigationContext('settings');
        }}
        onShowPreferences={() => {
          setShowSettings(false);
          setShowPreferences(true);
          setNavigationContext('settings');
        }}
        onShowAbout={() => {
          setShowSettings(false);
          setShowAbout(true);
          setNavigationContext('settings');
        }}
        onShowPrivacy={() => {
          setShowSettings(false);
          setShowPrivacy(true);
          setNavigationContext('settings');
        }}
        onShowHelp={() => {
          setShowSettings(false);
          setShowHelp(true);
          setNavigationContext('settings');
        }}
      />
    );
  }
  if (showNotifications) {
    return (
      <NotificationsScreen onBack={() => { setShowNotifications(false); reload(); fetchUnreadCount(); }} />
    );
  }

  if (showPreferences) {
    return (
      <UserPreferencesScreen 
        onBack={() => handleBackNavigation('preferences')}
      />
    );
  }

  if (showAbout) {
    return (
      <AboutScreen 
        onBack={() => handleBackNavigation('about')}
      />
    );
  }

  if (showPrivacy) {
    return (
      <PrivacyScreen 
        onBack={() => handleBackNavigation('privacy')}
      />
    );
  }

  if (showHelp) {
    return (
      <HelpScreen 
        onBack={() => handleBackNavigation('help')}
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
        <View style={[styles.content, isTablet && sidebarVisible && styles.contentWithSidebar]}>
        <View style={styles.header} testID="events-header">
          <Text style={styles.headerTitle} testID="events-title">Events</Text>
          <View style={styles.actions} testID="header-actions">
            <Pressable onPress={handleCreateEvent} style={[styles.iconBtn, styles.iconBtnAlt]} testID="create-event-button">
              <Icon name="Plus" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setShowNotifications(true)} style={[styles.iconBtn]} testID="notifications-button">
              <Icon name="Bell" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => setShowPlans(true)} style={styles.iconBtn} testID="plans-button">
              <Icon name="CreditCard" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setShowSettings(true)} style={styles.iconBtn} testID="settings-button">
              <Icon name="Settings" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert("Logout", "Logout functionality will be handled by the parent component")}
              style={styles.iconBtn}
              testID="logout-button"
            >
              <Icon name="LogOut" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer} testID="search-container">
          <View style={styles.searchWrap}>
            <Icon name="Search" size={20} color="rgba(255,255,255,0.7)" style={styles.searchIcon} />
            <TextInput
              placeholder="Search events..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              testID="search-input"
              returnKeyType="search"
              onSubmitEditing={() => reload()}
            />
            {query.length > 0 && (
              <Pressable 
                onPress={() => setQuery('')} 
                style={styles.clearButton}
                testID="clear-search-button"
              >
                <Icon name="CircleX" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Search Results Indicator */}
        {query.length > 0 && (
          <View style={styles.searchResultsIndicator}>
            <Text style={styles.searchResultsText}>
              {loading ? "Searching..." : `Found ${data.length} event${data.length !== 1 ? 's' : ''} for "${query}"`}
            </Text>
          </View>
        )}

        {/* Segmented control */}
        <View style={styles.segmentWrap} testID="status-filter-container">
          <Segmented
            options={[
              { key: "upcoming", label: "Upcoming" },
              { key: "drafts", label: "Drafts" },
              { key: "past", label: "Past" },
              { key: "deleted", label: "Deleted" },
            ]}
            value={statusTab}
            onChange={(v) => setStatusTab(v as EventStatusMobile)}
            testID="status-filter"
          />
        </View>

        {/* Applied Filters Bar */}
        <AppliedFiltersBar
          ownership={ownership}
          dietFilters={dietFilters}
          useNearby={useNearby}
          userLocation={userLocation}
          onRemoveFilter={handleRemoveFilter}
        />

        {/* Filter Toggle Button for Mobile */}
        {isMobile && (
          <Pressable 
            style={styles.filterToggleButton}
            onPress={() => setFiltersVisible(true)}
            testID="filter-toggle-button"
          >
            <Icon name="ListFilter" size={16} color="#fff" />
            <Text style={styles.filterToggleText}>Filters</Text>
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Sidebar Toggle Button for Tablet/Desktop */}
        {isTablet && (
          <Pressable 
            style={styles.sidebarToggleButton}
            onPress={() => setSidebarVisible(!sidebarVisible)}
            testID="sidebar-toggle-button"
          >
            <Icon name={sidebarVisible ? "PanelLeftClose" : "PanelLeftOpen"} size={16} color="#fff" />
            <Text style={styles.sidebarToggleText}>
              {sidebarVisible ? "Hide Filters" : "Show Filters"}
            </Text>
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* List */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={{ marginTop: 10 }}
          refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
          testID="events-list"
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyWrap} testID="loading-container">
                <ActivityIndicator color="#fff" testID="loading-indicator" />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : query.length > 0 ? (
              <View style={styles.emptyWrap} testID="no-search-results">
                <Icon name="Search" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.noResultsTitle}>No events found</Text>
                <Text style={styles.noResultsText}>
                  No events match your search for "{query}". Try adjusting your search terms or filters.
                </Text>
                <Pressable 
                  onPress={() => setQuery('')} 
                  style={styles.clearSearchButton}
                  testID="clear-search-results-button"
                >
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyWrap} testID="empty-state">
                <Icon name="Calendar" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyTitle}>No events yet</Text>
                <Text style={styles.emptyText}>Create your first event to get started!</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <EventCard 
              item={item} 
              onPress={() => handleEventPress(item.id)} 
              actions={getEventActions(item)}
              testID={`event-card-${item.id}`}
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
          ListFooterComponent={loading && data.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color="#fff" testID="load-more-indicator" /> : null}
        />
        </View>

        {/* Filter Bottom Sheet for Mobile */}
        {isMobile && (
          <FilterBottomSheet
            visible={filtersVisible}
            onClose={() => setFiltersVisible(false)}
            ownership={ownership}
            onOwnershipChange={(value) => setOwnership(value as Ownership)}
            dietFilters={dietFilters}
            onDietChange={(diet) => toggleDiet(diet as Diet)}
            useNearby={useNearby}
            onNearbyChange={setUseNearby}
            userLocation={userLocation}
            onRadiusChange={(radius) => {
              setUserLocation(prev => prev ? { ...prev, radius_km: radius } : null);
            }}
          />
        )}

        {/* Filter Sidebar for Tablet/Desktop */}
        {isTablet && (
          <Animated.View 
            style={[
              styles.sidebarOverlay,
              {
                transform: [{ translateX: sidebarTranslateX }],
              },
            ]}
          >
            <FilterSidebar
              ownership={ownership}
              onOwnershipChange={(value) => setOwnership(value as Ownership)}
              dietFilters={dietFilters}
              onDietChange={(diet) => toggleDiet(diet as Diet)}
              useNearby={useNearby}
              onNearbyChange={setUseNearby}
              userLocation={userLocation}
              onRadiusChange={(radius) => {
                setUserLocation(prev => prev ? { ...prev, radius_km: radius } : null);
              }}
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ------------------ Components ------------------ */

function DietTag({ diet }: { diet: Diet }) {
  const map = {
    veg: { bg: "#22C55E", fg: "#062E16", label: "veg" },
    nonveg: { bg: "#F59E0B", fg: "#3A2000", label: "non-veg" },
    mixed: { bg: "#7C3AED", fg: "#120B20", label: "mixed" },
  } as const;
  const d = map[diet];
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: d.bg + '22', borderWidth: 1, borderColor: d.bg + '55' }}>
      <Text style={{ color: d.fg, fontWeight: "700", fontSize: 12, textTransform: 'capitalize' }}>{d.label}</Text>
    </View>
  );
}

function StatusPill({ status, testID }: { status: "active" | "cancelled" | "draft" | "deleted" | "past"; testID?: string }) {
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
      testID={testID}
    >
      <Icon
        name={
          (status === "active" && "CircleCheck") ||
          (status === "cancelled" && "CircleX") ||
          (status === "draft" && "Pencil") ||
          (status === "deleted" && "Trash2") ||
          (status === "past" && "Clock") ||
          "Circle"
        }
        size={14}
        color="#fff"
        style={{ marginRight: 4 }}
      />
      <Text style={{ fontSize: 12, fontWeight: "700", color: config.textColor, marginLeft: 6 }} testID={`${testID}-text`}>{status}</Text>
    </View>
  );
}

function RolePill({ role, testID }: { role: 'host' | 'guest'; testID?: string }) {
  const config = role === 'host'
    ? { bg: 'rgba(236,72,153,0.95)', fg: '#3f0a24', icon: 'User' }
    : { bg: 'rgba(59,130,246,0.95)', fg: '#10284c', icon: 'Users' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, backgroundColor: config.bg }} testID={testID}>
      <Icon name={config.icon as any} size={12} color="#fff" />
      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: config.fg }} testID={`${testID}-text`}>{role}</Text>
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
              <Icon name="User" size={14} color="#fff" />
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
  actions = [],
  testID
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
  testID?: string;
}) {
  const dateLabel = formatDateTimeRange(new Date(item.date), item.time ? new Date(item.time) : undefined);
  const cardColors = gradients.button.primary;
  const roleLabel = item.ownership === 'mine' ? 'host' : 'guest';
  return (
    <Pressable onPress={onPress} testID={testID}>
      <LinearGradient
        colors={cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
      <View style={styles.cardHeader} testID={`${testID}-header`}>
        <Text style={styles.cardTitle} testID={`${testID}-title`}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 6 }}>
            <RolePill role={roleLabel} testID={`${testID}-role`} />
          </View>
          {item.statusBadge ? <StatusPill status={item.statusBadge} testID={`${testID}-status`} /> : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Icon name="Calendar" size={16} color="#EAF2FF" style={{ marginRight: 8 }} />
        <Text style={styles.metaText}>{dateLabel}</Text>
      </View>

      <View style={[styles.metaRow, { marginTop: 4 }]}>
        <Icon name="MapPin" size={16} color="#EAF2FF" style={{ marginRight: 8 }} />
        <Text style={styles.metaText}>{item.venue}</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Icon name="Users" size={16} color="#EAF2FF" />
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
        <View style={styles.actionsContainer} testID={`${testID}-actions`}>
          {actions.map((action) => (
            <Pressable 
              key={action.key}
              onPress={(e) => {
                e.stopPropagation(); // Prevent triggering the card press
                console.log("EventList - Action button pressed:", action.key, action.label, "for event:", item.id);
                action.handler();
              }}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              testID={`${testID}-action-${action.key}`}
            >
              <Icon name={
                action.icon === 'rocket-outline' ? 'Rocket' :
                action.icon === 'trash-outline' ? 'Trash2' :
                action.icon === 'close-circle-outline' ? 'CircleX' :
                action.icon === 'checkmark-circle-outline' ? 'CircleCheck' :
                action.icon === 'refresh-outline' ? 'RefreshCw' : 'Circle'
              } size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText} testID={`${testID}-action-${action.key}-text`}>{action.label}</Text>
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
    flex: 1,
    paddingHorizontal: PAGE_PADDING,
  },
  contentWithSidebar: {
    marginLeft: 280, // Width of the sidebar
  },
  sidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
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
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  searchContainer: {
    marginTop: 12,
    marginHorizontal: 0,
  },
  searchWrap: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: { 
    flex: 1, 
    color: "#fff", 
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResultsIndicator: {
    marginTop: 8,
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#7b2ff7",
  },
  searchResultsText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },

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
  emptyWrap: { 
    alignItems: "center", 
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  noResultsTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  noResultsText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  clearSearchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

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
  // Filter toggle button styles
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
    marginTop: 8,
  },
  filterToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterBadge: {
    backgroundColor: '#7B2FF7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Sidebar toggle button styles
  sidebarToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
    marginTop: 8,
  },
  sidebarToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
