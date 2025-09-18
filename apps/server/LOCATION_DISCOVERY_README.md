# Location-Based Event Discovery System

This document describes the implementation of a production-ready location-based event discovery system for the Potluck application.

## Overview

The system enables users to discover nearby potluck events based on their location and discoverability preferences. It includes:

- **Location-based event search** using PostGIS for accurate geographic queries
- **User location management** with privacy controls
- **Notification system** for nearby events
- **Discoverability settings** to control event visibility

## Architecture

### Database Schema

#### Events Table Extensions
```sql
-- Added to existing events table
ALTER TABLE public.events 
ADD COLUMN location_geog geography(Point, 4326),
ADD COLUMN visibility_radius_km integer DEFAULT 50,
ADD COLUMN city text;
```

#### User Profiles Extensions
```sql
-- Added to existing user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN home_geog geography(Point, 4326),
ADD COLUMN discoverability_enabled boolean DEFAULT true,
ADD COLUMN discoverability_radius_km integer DEFAULT 25,
ADD COLUMN city text,
ADD COLUMN geo_precision text DEFAULT 'city' CHECK (geo_precision IN ('exact', 'city'));
```

#### Notifications Table
```sql
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('event_created', 'event_updated', 'event_cancelled', 'join_request', 'join_approved', 'join_declined')),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    payload jsonb NOT NULL DEFAULT '{}',
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Key Functions

#### Location-Based Search
- `find_nearby_events(user_lat, user_lon, radius_km, limit_count, offset_count)` - Find events within radius
- `find_nearby_users_for_notification(event_id)` - Find users to notify about new events
- `update_user_location(user_id, latitude, longitude, city, geo_precision)` - Update user location

#### Event Management
- `get_event_with_location(event_id)` - Get event details with coordinates
- `update_event_location_geog()` - Trigger to auto-populate geography from lat/lng

## API Endpoints

### Event Discovery

#### Search Nearby Events
```http
GET /api/v1/discovery/events/nearby?lat=37.7749&lon=-122.4194&radius_km=25&limit=25&offset=0&q=potluck&date_from=2024-01-01&date_to=2024-12-31
```

**Query Parameters:**
- `lat` (required): User latitude (-90 to 90)
- `lon` (required): User longitude (-180 to 180)
- `radius_km` (optional): Search radius in km (1-200, default: 25)
- `limit` (optional): Results per page (1-100, default: 25)
- `offset` (optional): Pagination offset (default: 0)
- `q` (optional): Text search query
- `date_from` (optional): Filter events from date
- `date_to` (optional): Filter events to date
- `diet` (optional): Dietary preference filter

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Community Potluck",
      "description": "Monthly community gathering",
      "event_date": "2024-01-15T18:00:00Z",
      "city": "San Francisco",
      "distance_m": 1200,
      "is_public": true,
      "status": "published",
      "capacity_total": 50,
      "attendee_count": 12
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 25,
    "offset": 0,
    "has_more": false
  }
}
```

#### Search by City
```http
GET /api/v1/discovery/events/city?city=San Francisco&limit=25&offset=0
```

#### Get Popular Events
```http
GET /api/v1/discovery/events/popular?limit=25&offset=0
```

#### Get Event with Location
```http
GET /api/v1/discovery/events/{eventId}/location
```

### User Location Management

#### Get User Location Profile
```http
GET /api/v1/user-location/me/location
```

**Response:**
```json
{
  "user_id": "uuid",
  "city": "San Francisco",
  "discoverability_enabled": true,
  "discoverability_radius_km": 25,
  "geo_precision": "exact",
  "has_location": true,
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

#### Update User Location
```http
PATCH /api/v1/user-location/me/location
Content-Type: application/json

{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "city": "San Francisco",
  "geo_precision": "exact"
}
```

#### Update Discoverability Settings
```http
PATCH /api/v1/user-location/me/discoverability
Content-Type: application/json

{
  "discoverability_enabled": true,
  "discoverability_radius_km": 25,
  "geo_precision": "exact"
}
```

#### Remove User Location
```http
DELETE /api/v1/user-location/me/location
```

#### Search Cities
```http
GET /api/v1/user-location/cities/search?q=San&limit=10
```

### Notifications

#### Get User Notifications
```http
GET /api/v1/discovery/notifications?limit=20&offset=0
```

#### Mark Notification as Read
```http
PATCH /api/v1/discovery/notifications/{notificationId}/read
```

#### Mark All Notifications as Read
```http
PATCH /api/v1/discovery/notifications/read-all
```

#### Get Unread Count
```http
GET /api/v1/discovery/notifications/unread-count
```

## Implementation Details

### Location Privacy

The system respects user privacy by:

1. **Geo Precision Control**: Users can choose between "exact" and "city" level precision
2. **Discoverability Toggle**: Users can disable event discovery entirely
3. **Radius Control**: Users set their preferred discovery radius (1-200 km)
4. **Location Removal**: Users can remove their location data at any time

### Performance Optimizations

1. **PostGIS Indexes**: GIST indexes on geography columns for fast spatial queries
2. **Pagination**: All list endpoints support pagination to limit data transfer
3. **Caching**: Location data is cached in user profiles to avoid repeated calculations
4. **Batch Operations**: Notifications are created in batches for efficiency

### Error Handling

- **Coordinate Validation**: Latitude/longitude values are validated before processing
- **Radius Limits**: Search radius is limited to reasonable values (1-200 km)
- **Graceful Degradation**: System falls back to city-based search when coordinates are unavailable
- **Notification Failures**: Event publishing succeeds even if notifications fail

## Database Migrations

Run the following migrations in order:

1. `005_location_discovery.sql` - PostGIS setup and location columns
2. `006_notifications.sql` - Notifications table and functions

## Testing

Run the test script to verify the system:

```bash
cd apps/server
node test-location-discovery.js
```

This will test:
- PostGIS extension availability
- Database schema updates
- Location functions
- Sample data creation
- Location-based search
- Notification system

## Usage Examples

### Setting Up User Location

```javascript
// Update user location
const response = await fetch('/api/v1/user-location/me/location', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    geo_precision: 'exact'
  })
});
```

### Searching for Nearby Events

```javascript
// Search for nearby events
const response = await fetch('/api/v1/discovery/events/nearby?lat=37.7749&lon=-122.4194&radius_km=25', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(`Found ${data.events.length} events nearby`);
```

### Creating an Event with Location

```javascript
// Create event with location
const response = await fetch('/api/v1/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Community Potluck',
    description: 'Monthly gathering',
    event_date: '2024-01-15T18:00:00Z',
    min_guests: 5,
    max_guests: 50,
    capacity_total: 50,
    meal_type: 'mixed',
    is_public: true,
    location: {
      name: 'Community Center',
      formatted_address: '123 Main St, San Francisco, CA',
      latitude: 37.7849,
      longitude: -122.4094
    },
    items: [
      { name: 'Pasta Salad', category: 'main', per_guest_qty: 0.5 },
      { name: 'Dessert', category: 'dessert', per_guest_qty: 0.3 }
    ]
  })
});
```

## Security Considerations

1. **RLS Policies**: All tables have Row Level Security policies
2. **Input Validation**: All inputs are validated using Zod schemas
3. **Authentication**: All endpoints require valid authentication
4. **Privacy Controls**: Users have full control over their location data
5. **Rate Limiting**: Consider implementing rate limiting for search endpoints

## Future Enhancements

1. **Push Notifications**: Integrate with mobile push notification services
2. **Email Digests**: Daily/weekly email summaries of nearby events
3. **Advanced Filtering**: More sophisticated filtering options (dietary, time, etc.)
4. **Location History**: Track user location changes over time
5. **Heat Maps**: Visual representation of event density
6. **Recommendation Engine**: ML-based event recommendations
7. **Offline Support**: Cache nearby events for offline viewing

## Troubleshooting

### Common Issues

1. **PostGIS Not Available**: Ensure PostGIS extension is installed in Supabase
2. **No Nearby Events**: Check if events have valid location data
3. **Search Not Working**: Verify coordinates are within valid ranges
4. **Notifications Not Sending**: Check if users have discoverability enabled

### Debug Queries

```sql
-- Check PostGIS extension
SELECT * FROM pg_extension WHERE extname = 'postgis';

-- Check events with location data
SELECT id, title, city, ST_AsText(location_geog) as location
FROM events 
WHERE location_geog IS NOT NULL 
LIMIT 5;

-- Check user discoverability settings
SELECT user_id, discoverability_enabled, discoverability_radius_km, city
FROM user_profiles 
WHERE home_geog IS NOT NULL
LIMIT 5;
```

## Support

For issues or questions about the location discovery system, please refer to the main project documentation or create an issue in the project repository.