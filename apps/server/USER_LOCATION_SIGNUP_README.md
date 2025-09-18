# User Location Signup & Notification System

This document describes the enhanced user signup process that includes location data and the automatic notification system for nearby events.

## 🎯 **Overview**

The system now supports:
- **Location-based user signup** with coordinates and discoverability settings
- **Automatic notifications** to nearby users when events are created
- **Location-based event discovery** using PostGIS geographic queries
- **Privacy controls** for user location and discoverability preferences

## 📝 **Enhanced User Signup**

### **API Endpoint**
```http
POST /api/v1/auth/signup
Content-Type: application/json
```

### **Request Body**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "city": "San Francisco",
  "geo_precision": "exact",
  "discoverability_enabled": true,
  "discoverability_radius_km": 25
}
```

### **Location Fields**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `latitude` | number | No | User's latitude (-90 to 90) | `37.7749` |
| `longitude` | number | No | User's longitude (-180 to 180) | `-122.4194` |
| `city` | string | No | User's city name | `"San Francisco"` |
| `geo_precision` | string | No | Location precision preference | `"exact"` or `"city"` |
| `discoverability_enabled` | boolean | No | Allow event discovery (default: true) | `true` |
| `discoverability_radius_km` | number | No | Discovery radius in km (default: 25) | `25` |

### **Response**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

## 🔔 **Notification System**

### **How It Works**

1. **User A** signs up with location (37.7749, -122.4194)
2. **User B** signs up with nearby location (37.7849, -122.4094)
3. **User A** creates a public event at (37.7799, -122.4144)
4. System calculates distance: ~1.2km between users
5. System finds User B is within User A's event radius
6. System creates notification for User B
7. User B can see notification via GET /notifications

### **Notification Triggers**

Notifications are sent when:
- A **public event** is published (`is_public: true`)
- The event has a valid location (`latitude` and `longitude`)
- Nearby users have `discoverability_enabled: true`
- Users are within the event's visibility radius

### **Notification Content**

```json
{
  "id": "notification_uuid",
  "user_id": "user_uuid",
  "type": "event_created",
  "event_id": "event_uuid",
  "payload": {
    "type": "event_created",
    "event_id": "event_uuid",
    "reason": "nearby",
    "event_title": "Community Potluck",
    "event_date": "2024-01-15T18:00:00Z",
    "distance_km": 1.2,
    "city": "San Francisco"
  },
  "read_at": null,
  "created_at": "2024-01-01T12:00:00Z"
}
```

## 🗺️ **Location-Based Event Discovery**

### **Search Nearby Events**
```http
GET /api/v1/events?lat=37.7749&lon=-122.4194&radius_km=25
Authorization: Bearer <token>
```

### **Search by City**
```http
GET /api/v1/events?near=San Francisco&is_public=true
Authorization: Bearer <token>
```

### **Text Search with Location**
```http
GET /api/v1/events?q=potluck&diet=veg&is_public=true
Authorization: Bearer <token>
```

## 🔧 **Implementation Details**

### **Database Schema**

#### User Profiles Table
```sql
CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text,
  city text,
  home_geog geography(Point, 4326),
  discoverability_enabled boolean DEFAULT true,
  discoverability_radius_km integer DEFAULT 25,
  geo_precision text DEFAULT 'city' CHECK (geo_precision IN ('exact', 'city')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Events Table
```sql
ALTER TABLE events ADD COLUMN location_geog geography(Point, 4326);
ALTER TABLE events ADD COLUMN visibility_radius_km integer DEFAULT 50;
ALTER TABLE events ADD COLUMN city text;
```

#### Notifications Table
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('event_created', 'event_updated', 'event_cancelled', 'join_request', 'join_approved', 'join_declined')),
  event_id uuid REFERENCES events(id),
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### **Key Functions**

#### Location Update Function
```sql
CREATE OR REPLACE FUNCTION update_user_location(
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_city text DEFAULT NULL,
  p_geo_precision text DEFAULT 'city'
)
RETURNS boolean
```

#### Nearby Events Search
```sql
CREATE OR REPLACE FUNCTION find_nearby_events(
  user_lat double precision,
  user_lon double precision,
  radius_km integer DEFAULT 25,
  limit_count integer DEFAULT 25,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(...)
```

#### Nearby Users for Notifications
```sql
CREATE OR REPLACE FUNCTION find_nearby_users_for_notification(
  event_id uuid
)
RETURNS TABLE(user_id uuid, distance_m double precision)
```

## 🛡️ **Privacy & Security**

### **Location Privacy**
- **Geo Precision Control**: Users can choose "exact" or "city" level precision
- **Discoverability Toggle**: Users can disable event discovery entirely
- **Radius Control**: Users set their preferred discovery radius (1-200 km)
- **Location Removal**: Users can remove their location data at any time

### **Data Protection**
- Location data is stored as PostGIS geography points
- RLS policies protect user data
- Notifications respect user preferences
- No location data exposed in API responses unless explicitly requested

## 📊 **API Endpoints**

### **User Management**
- `POST /api/v1/auth/signup` - Create user with location
- `GET /api/v1/user-location/me/location` - Get user location profile
- `PATCH /api/v1/user-location/me/location` - Update user location
- `PATCH /api/v1/user-location/me/discoverability` - Update discoverability settings
- `DELETE /api/v1/user-location/me/location` - Remove user location

### **Event Discovery**
- `GET /api/v1/events?lat=...&lon=...` - Search nearby events
- `GET /api/v1/events?near=...` - Search by city
- `GET /api/v1/events?is_public=true` - Discover public events

### **Notifications**
- `GET /api/v1/discovery/notifications` - Get user notifications
- `PATCH /api/v1/discovery/notifications/:id/read` - Mark as read
- `GET /api/v1/discovery/notifications/unread-count` - Get unread count

## 🧪 **Testing**

### **Test Scenario**
1. Create two users with nearby locations
2. Create a public event as one user
3. Verify notification is sent to nearby user
4. Test location-based event search
5. Verify distance calculations

### **Test Data**
```javascript
// User 1: San Francisco
{
  email: "user1@test.com",
  latitude: 37.7749,
  longitude: -122.4194,
  city: "San Francisco"
}

// User 2: Nearby in San Francisco
{
  email: "user2@test.com", 
  latitude: 37.7849,
  longitude: -122.4094,
  city: "San Francisco"
}

// Event: Between both users
{
  title: "Test Community Potluck",
  latitude: 37.7799,
  longitude: -122.4144,
  is_public: true
}
```

## 🚀 **Deployment**

### **Database Migrations**
1. Run `005_location_discovery.sql` - PostGIS setup and location columns
2. Run `006_notifications.sql` - Notifications table and functions

### **Environment Variables**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Testing Checklist**
- [ ] User signup with location data
- [ ] Location data stored in user_profiles
- [ ] Event creation triggers notifications
- [ ] Nearby users receive notifications
- [ ] Location-based event search works
- [ ] Privacy controls function correctly

## 📈 **Performance**

### **Optimizations**
- PostGIS GIST indexes for fast spatial queries
- Batch notification creation
- Efficient distance calculations
- Pagination for large result sets

### **Monitoring**
- Track notification delivery rates
- Monitor location query performance
- Log user privacy preferences
- Measure search accuracy

## 🔮 **Future Enhancements**

1. **Push Notifications**: Mobile push notifications for nearby events
2. **Email Digests**: Daily/weekly email summaries
3. **Location History**: Track user location changes over time
4. **Heat Maps**: Visual representation of event density
5. **Recommendation Engine**: ML-based event recommendations
6. **Real-time Updates**: WebSocket updates for new nearby events

---

The user location signup and notification system provides a seamless way for users to discover nearby events while maintaining privacy and performance. The system automatically connects users based on proximity and interests, creating a vibrant community of potluck enthusiasts! 🍽️