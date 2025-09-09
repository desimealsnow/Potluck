/**
 * Common types shared across the mobile app
 */

// Import the components type from generated schema
import type { components } from './types.gen';

// Extract types from the components namespace for easier usage
export type EventCreate = components['schemas']['EventCreate'];
export type EventBase = components['schemas']['EventBase'];
export type EventCore = components['schemas']['EventCore'];
export type EventFull = components['schemas']['EventFull'];
export type EventSummary = components['schemas']['EventSummary'];
export type EventStatus = components['schemas']['EventStatus'];
export type EventUpdate = components['schemas']['EventUpdate'];
export type EventCancel = components['schemas']['EventCancel'];
export type Item = components['schemas']['Item'];
export type ItemCreate = components['schemas']['ItemCreate'];
export type ItemUpdate = components['schemas']['ItemUpdate'];
export type ItemAssign = components['schemas']['ItemAssign'];
export type Participant = components['schemas']['Participant'];
export type ParticipantAdd = components['schemas']['ParticipantAdd'];
export type ParticipantUpdate = components['schemas']['ParticipantUpdate'];
export type ParticipantBulkAdd = components['schemas']['ParticipantBulkAdd'];
export type Location = components['schemas']['Location'];
export type BillingPlan = components['schemas']['BillingPlan'];
export type Subscription = components['schemas']['Subscription'];
export type CheckoutSession = components['schemas']['CheckoutSession'];
export type EventPayment = components['schemas']['EventPayment'];
export type SignUp = components['schemas']['SignUp'];
export type Login = components['schemas']['Login'];
export type ApiError = components['schemas']['Error'];

// Alias for backward compatibility
export type EventCreatePayload = EventCreate;

// Mobile-specific type extensions
export type MealType = "veg" | "nonveg" | "mixed";

export type EventStatusMobile = "upcoming" | "past";

export type Ownership = "all" | "mine" | "invited";

export type Diet = MealType; // Alias for consistency

export type Attendee = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type EventItem = {
  id: string;
  title: string;
  date: string; // ISO
  time?: string; // optional if backend separates
  venue: string;
  attendeeCount: number;
  diet: Diet;
  statusBadge?: "active" | "cancelled";
  ownership?: "mine" | "invited" | "public";
  attendeesPreview?: Attendee[]; // first 3–4 faces
};

export type LocationSuggestion = {
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export type Dish = {
  id: string;
  name: string;
  category?: string;
  per_guest_qty: number;
};

// Event DTOs for mobile screens
export type EventDTO = {
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

export type ItemDTO = {
  id: string;
  name: string;
  requiredQty: number;
  claimedQty: number;
  perGuest?: boolean;
};

export type ParticipantDTO = {
  id: string;
  name: string;
  avatar?: string;
  role?: "host";
  status: "attending" | "pending" | "declined";
};

// API Query types
export type EventsQuery = {
  page: number;
  limit: number;
  q?: string;
  status: EventStatusMobile;
  ownership: Ownership;
  diet?: Diet[]; // multi-select
};

// UI Component Props
export type Tab = "overview" | "items" | "participants";

export type ChipTone = "sky" | "emerald" | "violet" | "peach" | "indigo";

export type PillTone = "green" | "amber" | "rose" | "indigo";

export type BadgeTone = "peach" | "indigo";

// Form types
export type StepperStep = 0 | 1 | 2 | 3;

export type RSVPStatus = "accepted" | "declined" | "none";

// API Response types
export type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
  message?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  hasMore: boolean;
  totalCount?: number;
  nextOffset?: number;
};
