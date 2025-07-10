import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

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
const EventBase = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    event_date: z.string().datetime({ offset: true }),
    min_guests: z.number().int().gte(1),
    max_guests: z.number().int().optional(),
    meal_type: z.enum(["veg", "nonveg", "mixed"]),
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
    id: z.string(),
    name: z.string(),
    amount_cents: z.number().int(),
    currency: z.string(),
    interval: z.enum(["month", "year"]),
    is_active: z.boolean().optional(),
  })
  .passthrough();
const CheckoutSession = z
  .object({ checkout_url: z.string().url() })
  .passthrough();
const Subscription = z
  .object({
    id: z.string().uuid(),
    plan_id: z.string(),
    status: z.enum([
      "active",
      "trialing",
      "past_due",
      "canceled",
      "incomplete",
    ]),
    current_period_end: z.string().datetime({ offset: true }),
  })
  .passthrough();
const EventPayment = z
  .object({
    id: z.string().uuid(),
    event_id: z.string().uuid().optional(),
    user_id: z.string().uuid(),
    amount_cents: z.number().int(),
    currency: z.string().optional(),
    status: z.enum(["pending", "paid", "refunded"]),
    created_at: z.string().datetime({ offset: true }).optional(),
  })
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
  CheckoutSession,
  Subscription,
  EventPayment,
  EventIdParam,
};

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
        schema: z.object({ plan_id: z.string() }).passthrough(),
      },
    ],
    response: z.object({ checkout_url: z.string().url() }).passthrough(),
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
          .enum(["draft", "published", "cancelled", "completed"])
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
    path: "/events/:eventId/pay",
    alias: "postEventsEventIdpay",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ amount_cents: z.number().int().gte(1) })
          .partial()
          .passthrough(),
      },
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ checkout_url: z.string().url() }).passthrough(),
  },
  {
    method: "get",
    path: "/events/:eventId/payments",
    alias: "getEventsEventIdpayments",
    requestFormat: "json",
    parameters: [
      {
        name: "eventId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(EventPayment),
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
