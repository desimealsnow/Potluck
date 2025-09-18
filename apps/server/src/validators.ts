import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";
import { getProviderNames } from '@payments/core';

// Dynamic provider enum based on supported providers
const ProviderEnum = z.enum(getProviderNames() as [string, ...string[]]);

const SignUp = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().optional(),
  })
  .passthrough();
const Login = z
  .object({ email: z.string().email(), password: z.string() })
  .passthrough();
const Location = z
  .object({
    name: z.string(),
    formatted_address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .passthrough();

// Location-based discovery schemas
const LocationUpdate = z
  .object({
    latitude: z.number().min(-90).max(90, 'Invalid latitude'),
    longitude: z.number().min(-180).max(180, 'Invalid longitude'),
    city: z.string().optional(),
    geo_precision: z.enum(['exact', 'city']).optional()
  })
  .passthrough();

const DiscoverabilitySettings = z
  .object({
    discoverability_enabled: z.boolean(),
    discoverability_radius_km: z.number().int().min(1).max(200, 'Radius must be between 1 and 200 km'),
    geo_precision: z.enum(['exact', 'city'])
  })
  .passthrough();

const LocationSearchQuery = z
  .object({
    lat: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= -90 && val <= 90, 'Invalid latitude'),
    lon: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= -180 && val <= 180, 'Invalid longitude'),
    radius_km: z.string().optional().transform(val => val ? parseInt(val) : 25).refine(val => val >= 1 && val <= 200, 'Radius must be between 1 and 200 km'),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 25).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
    offset: z.string().optional().transform(val => val ? parseInt(val) : 0).refine(val => val >= 0, 'Offset must be non-negative'),
    q: z.string().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    diet: z.string().optional()
  })
  .passthrough();

const CitySearchQuery = z
  .object({
    city: z.string().min(1, 'City name is required'),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 25).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
    offset: z.string().optional().transform(val => val ? parseInt(val) : 0).refine(val => val >= 0, 'Offset must be non-negative')
  })
  .passthrough();
const EventBase = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    event_date: z.string().datetime({ offset: true }),
    min_guests: z.number().int().gte(1),
    max_guests: z.number().int().optional(),
    capacity_total: z.number().int().gte(1),
    status: z
      .enum(["draft", "published", "cancelled", "completed", "purged"])
      .optional(),
    meal_type: z.enum(["veg", "nonveg", "mixed"]),
    is_public: z.boolean().optional().default(false),
    location: Location,
  })
  .passthrough();
const ItemCreate = z
  .object({
    name: z.string(),
    category: z.string().optional(),
    per_guest_qty: z.number().gte(0.01),
  })
  .passthrough();
const EventCreate = EventBase.and(
  z.object({ items: z.array(ItemCreate) }).passthrough()
);
const EventWithItems = z
  .object({
    event: z.object({}).partial().passthrough(),
    items: z.array(ItemCreate),
  })
  .partial()
  .passthrough();
const Error = z
  .object({ message: z.string(), code: z.string().optional() })
  .passthrough();
const EventSummary = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    event_date: z.string().datetime({ offset: true }),
    attendee_count: z.number().int(),
    meal_type: z.enum(["veg", "nonveg", "mixed"]),
  })
  .passthrough();
const PaginatedEventSummary = z
  .object({
    data: z.array(EventSummary),
    nextOffset: z.number().int(),
    totalCount: z.number().int(),
  })
  .partial()
  .passthrough();
const EventCore = EventBase.and(
  z
    .object({
      id: z.string().uuid(),
      attendee_count: z.number().int(),
      created_by: z.string().uuid(),
    })
    .passthrough()
);
const Item = ItemCreate.and(
  z
    .object({
      id: z.string().uuid(),
      required_qty: z.number(),
      assigned_to: z.union([z.string(), z.null()]).optional(),
    })
    .passthrough()
);
const ParticipantAdd = z
  .object({
    user_id: z.string().uuid(),
    status: z
      .enum(["invited", "pending", "accepted", "declined", "maybe"])
      .optional(),
  })
  .passthrough();
const Participant = ParticipantAdd.and(
  z
    .object({
      id: z.string().uuid(),
      joined_at: z.string().datetime({ offset: true }),
    })
    .partial()
    .passthrough()
);
const EventFull = z
  .object({
    event: EventCore,
    items: z.array(Item),
    participants: z.array(Participant),
  })
  .passthrough();
const EventUpdate = EventCreate;
const EventCancel = z
  .object({
    reason: z.string().min(3).max(255),
    notifyGuests: z.boolean().optional().default(true),
  })
  .passthrough();
const ItemUpdate = ItemCreate;
const ItemAssign = z
  .object({ user_id: z.string().uuid() })
  .partial()
  .passthrough();
const ParticipantUpdate = z
  .object({
    status: z.enum(["invited", "pending", "accepted", "declined", "maybe"]),
  })
  .passthrough();
const ParticipantBulkAdd = z
  .object({ invites: z.array(ParticipantAdd) })
  .passthrough();
const postEventsEventIdparticipantsbulk_Body = z
  .object({ invites: z.array(ParticipantBulkAdd) })
  .partial()
  .passthrough();
const BillingPlan = z
  .object({
    id: z.string().uuid(),
    price_id: z.string(),
    provider: ProviderEnum,
    name: z.string(),
    amount_cents: z.number().int(),
    currency: z.string(),
    interval: z.enum(["month", "year"]),
    is_active: z.boolean().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const postBillingcheckoutsubscription_Body = z
  .object({
    plan_id: z.string().uuid(),
    provider: ProviderEnum,
  })
  .passthrough();
const CheckoutSession = z
  .object({ checkout_url: z.string().url() })
  .passthrough();
const Subscription = z
  .object({
    id: z.string().uuid(),
    plan_id: z.string().uuid(),
    provider_subscription_id: z.string(),
    provider: ProviderEnum,
    status: z.enum([
      "active",
      "trialing",
      "past_due",
      "canceled",
      "incomplete",
      "incomplete_expired",
    ]),
    current_period_start: z.string().datetime({ offset: true }).optional(),
    current_period_end: z.string().datetime({ offset: true }),
    trial_start: z.string().datetime({ offset: true }).optional(),
    trial_end: z.string().datetime({ offset: true }).optional(),
    cancel_at_period_end: z.boolean().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const PaymentMethod = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    provider: ProviderEnum,
    method_id: z.string(),
    is_default: z.boolean(),
    brand: z.string().optional(),
    last_four: z.string().optional(),
    exp_month: z.number().int().optional(),
    exp_year: z.number().int().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const PaymentMethodCreate = z
  .object({
    provider: ProviderEnum,
    method_id: z.string(),
    is_default: z.boolean().optional().default(false),
  })
  .passthrough();
const PaymentMethodUpdate = z
  .object({ is_default: z.boolean() })
  .partial()
  .passthrough();
const Invoice = z
  .object({
    id: z.string().uuid(),
    subscription_id: z.string().uuid().optional(),
    user_id: z.string().uuid(),
    invoice_id: z.string().optional(),
    provider: ProviderEnum,
    amount_cents: z.number().int(),
    currency: z.string(),
    status: z.enum(["draft", "open", "paid", "void", "uncollectible"]),
    invoice_date: z.string().datetime({ offset: true }),
    paid_date: z.string().datetime({ offset: true }).optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const SubscriptionUpdate = z
  .object({ cancel_at_period_end: z.boolean(), plan_id: z.string().uuid() })
  .partial()
  .passthrough();
const EventIdParam = z.object({ eventId: z.string().uuid() }).passthrough();

export const schemas = {
  SignUp,
  Login,
  Location,
  EventBase,
  ItemCreate,
  EventCreate,
  EventWithItems,
  Error,
  EventSummary,
  PaginatedEventSummary,
  EventCore,
  Item,
  ParticipantAdd,
  Participant,
  EventFull,
  EventUpdate,
  EventCancel,
  ItemUpdate,
  ItemAssign,
  ParticipantUpdate,
  ParticipantBulkAdd,
  postEventsEventIdparticipantsbulk_Body,
  BillingPlan,
  postBillingcheckoutsubscription_Body,
  CheckoutSession,
  Subscription,
  PaymentMethod,
  PaymentMethodCreate,
  PaymentMethodUpdate,
  Invoice,
  SubscriptionUpdate,
  EventIdParam,
  // Location-based discovery schemas
  LocationUpdate,
  DiscoverabilitySettings,
  LocationSearchQuery,
  CitySearchQuery,
};

// Import join request schemas
export { 
  JoinRequestStatus,
  JoinRequestAdd,
  JoinRequest,
  PaginatedJoinRequests,
  Availability,
  ListRequestsQuery
} from './modules/requests';

const endpoints = makeApi([
  {
    method: "get",
    path: "/_internal/schema-id-param",
    alias: "get_internalschemaIdParam",
    requestFormat: "json",
    response: z.object({ eventId: z.string().uuid() }).passthrough(),
  },
  {
    method: "post",
    path: "/auth/login",
    alias: "postAuthlogin",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Login,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Invalid credentials`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/auth/logout",
    alias: "postAuthlogout",
    requestFormat: "json",
    response: z.void(),
  },
  {
    method: "post",
    path: "/auth/signup",
    alias: "postAuthsignup",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SignUp,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Validation error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/billing/checkout/subscription",
    alias: "postBillingcheckoutsubscription",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postBillingcheckoutsubscription_Body,
      },
    ],
    response: z.object({ checkout_url: z.string().url() }).passthrough(),
  },
  {
    method: "get",
    path: "/billing/invoices",
    alias: "getBillinginvoices",
    requestFormat: "json",
    response: z.array(Invoice),
  },
  {
    method: "get",
    path: "/billing/invoices/:invoiceId",
    alias: "getBillinginvoicesInvoiceId",
    requestFormat: "json",
    parameters: [
      {
        name: "invoiceId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Invoice,
  },
  {
    method: "get",
    path: "/billing/invoices/:invoiceId/download",
    alias: "getBillinginvoicesInvoiceIddownload",
    requestFormat: "json",
    parameters: [
      {
        name: "invoiceId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/billing/payment-methods",
    alias: "getBillingpaymentMethods",
    requestFormat: "json",
    response: z.array(PaymentMethod),
  },
  {
    method: "post",
    path: "/billing/payment-methods",
    alias: "postBillingpaymentMethods",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PaymentMethodCreate,
      },
    ],
    response: PaymentMethod,
  },
  {
    method: "get",
    path: "/billing/payment-methods/:methodId",
    alias: "getBillingpaymentMethodsMethodId",
    requestFormat: "json",
    parameters: [
      {
        name: "methodId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PaymentMethod,
  },
  {
    method: "put",
    path: "/billing/payment-methods/:methodId",
    alias: "putBillingpaymentMethodsMethodId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ is_default: z.boolean() }).partial().passthrough(),
      },
      {
        name: "methodId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PaymentMethod,
  },
  {
    method: "delete",
    path: "/billing/payment-methods/:methodId",
    alias: "deleteBillingpaymentMethodsMethodId",
    requestFormat: "json",
    parameters: [
      {
        name: "methodId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/billing/payment-methods/:methodId/set-default",
    alias: "postBillingpaymentMethodsMethodIdsetDefault",
    requestFormat: "json",
    parameters: [
      {
        name: "methodId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/billing/plans",
    alias: "getBillingplans",
    requestFormat: "json",
    response: z.array(BillingPlan),
  },
  {
    method: "get",
    path: "/billing/subscriptions",
    alias: "getBillingsubscriptions",
    requestFormat: "json",
    response: z.array(Subscription),
  },
  {
    method: "get",
    path: "/billing/subscriptions/:subscriptionId",
    alias: "getBillingsubscriptionsSubscriptionId",
    requestFormat: "json",
    parameters: [
      {
        name: "subscriptionId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Subscription,
  },
  {
    method: "put",
    path: "/billing/subscriptions/:subscriptionId",
    alias: "putBillingsubscriptionsSubscriptionId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SubscriptionUpdate,
      },
      {
        name: "subscriptionId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Subscription,
  },
  {
    method: "delete",
    path: "/billing/subscriptions/:subscriptionId",
    alias: "deleteBillingsubscriptionsSubscriptionId",
    requestFormat: "json",
    parameters: [
      {
        name: "subscriptionId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/billing/subscriptions/:subscriptionId/reactivate",
    alias: "postBillingsubscriptionsSubscriptionIdreactivate",
    requestFormat: "json",
    parameters: [
      {
        name: "subscriptionId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Subscription,
  },
  {
    method: "post",
    path: "/billing/webhook/stripe",
    alias: "postBillingwebhookstripe",
    description: `Handles checkout.session.*, invoice.*, payment_intent.* events.
Stripe signs the payload; verify in the handler.
`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/events",
    alias: "postEvents",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: EventCreate,
      },
    ],
    response: EventWithItems,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/events",
    alias: "getEvents",
    description: `List events I host or attend`,
    requestFormat: "json",
    parameters: [
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(20),
      },
      {
        name: "offset",
        type: "Query",
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: "status",
        type: "Query",
        schema: z
          .enum(["draft", "published", "cancelled", "completed", "purged"])
          .optional(),
      },
      {
        name: "startsAfter",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: "startsBefore",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
    ],
    response: PaginatedEventSummary,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/events/:eventId",
    alias: "getEventsEventId",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: EventFull,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "patch",
    path: "/events/:eventId",
    alias: "patchEventsEventId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: EventUpdate,
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: EventFull,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/events/:eventId",
    alias: "deleteEventsEventId",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/events/:eventId/cancel",
    alias: "postEventsEventIdcancel",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: EventCancel,
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: EventFull,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/events/:eventId/complete",
    alias: "postEventsEventIdcomplete",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: EventFull,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/events/:eventId/items",
    alias: "getEventsEventIditems",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Item,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/events/:eventId/items",
    alias: "postEventsEventIditems",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Item,
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ItemCreate,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/events/:eventId/items/:itemId",
    alias: "getEventsEventIditemsItemId",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "itemId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Item,
  },
  {
    method: "put",
    path: "/events/:eventId/items/:itemId",
    alias: "putEventsEventIditemsItemId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ItemUpdate,
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "itemId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "delete",
    path: "/events/:eventId/items/:itemId",
    alias: "deleteEventsEventIditemsItemId",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "itemId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/events/:eventId/items/:itemId/assign",
    alias: "postEventsEventIditemsItemIdassign",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ user_id: z.string().uuid() })
          .partial()
          .passthrough(),
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "itemId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "delete",
    path: "/events/:eventId/items/:itemId/assign",
    alias: "deleteEventsEventIditemsItemIdassign",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "itemId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/events/:eventId/participants",
    alias: "postEventsEventIdparticipants",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ParticipantAdd,
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/events/:eventId/participants",
    alias: "getEventsEventIdparticipants",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(Participant),
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/events/:eventId/participants/:partId",
    alias: "getEventsEventIdparticipantsPartId",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "partId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Participant,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "put",
    path: "/events/:eventId/participants/:partId",
    alias: "putEventsEventIdparticipantsPartId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ParticipantUpdate,
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "partId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Participant,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/events/:eventId/participants/:partId",
    alias: "deleteEventsEventIdparticipantsPartId",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "partId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/events/:eventId/participants/:partId/resend",
    alias: "postEventsEventIdparticipantsPartIdresend",
    requestFormat: "json",
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/events/:eventId/participants/bulk",
    alias: "postEventsEventIdparticipantsbulk",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postEventsEventIdparticipantsbulk_Body,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/events/:eventId/publish",
    alias: "postEventsEventIdpublish",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: EventFull,
    errors: [
      {
        status: 401,
        description: `Access token missing or invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `The caller lacks permission`,
        schema: Error,
      },
      {
        status: 404,
        description: `Resource not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Request conflicts with current resource state`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/locations",
    alias: "getLocations",
    requestFormat: "json",
    parameters: [
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.array(Location),
  },
  {
    method: "post",
    path: "/locations",
    alias: "postLocations",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Location,
      },
    ],
    response: z.void(),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
