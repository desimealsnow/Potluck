# Integrated Location-Based Event Search

The `/api/v1/events` endpoint has been enhanced with comprehensive location-based search capabilities, providing a unified interface for all event discovery needs.

## 🎯 **Search Modes**

The endpoint automatically detects the search mode based on query parameters:

### 1. **Location Search Mode** 🗺️
**Triggered by:** `lat`/`lon` OR `near` parameter

**Features:**
- PostGIS-powered geographic queries
- Distance-based sorting
- Radius filtering (1-200 km)
- City-based search fallback

**Example:**
```http
GET /api/v1/events?lat=37.7749&lon=-122.4194&radius_km=25&q=potluck&diet=veg
```

### 2. **Discovery Mode** 🌐
**Triggered by:** `is_public=true` OR location search

**Features:**
- Public events + user's events
- Text search across title, description, city
- Dietary preference filtering
- Full event discovery capabilities

**Example:**
```http
GET /api/v1/events?is_public=true&q=community&diet=veg,mixed
```

### 3. **Traditional Mode** 👤
**Triggered by:** No location/discovery parameters

**Features:**
- User's events only (hosted + invited)
- All existing filters (status, ownership, dates)
- Backward compatibility maintained

**Example:**
```http
GET /api/v1/events?status=published&ownership=mine
```

## 📋 **Query Parameters**

### **Core Parameters**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | integer | Results per page (1-100) | `20` |
| `offset` | integer | Pagination offset (≥0) | `0` |
| `status` | string | Event status filter | `published` |
| `ownership` | string | Event ownership filter | `mine` |

### **Location Parameters**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `lat` | number | Latitude (-90 to 90) | `37.7749` |
| `lon` | number | Longitude (-180 to 180) | `-122.4194` |
| `radius_km` | integer | Search radius (1-200 km) | `25` |
| `near` | string | City/area name search | `San Francisco` |

### **Discovery Parameters**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `is_public` | boolean | Include public events | `true` |
| `q` | string | Text search query | `potluck` |
| `diet` | string | Dietary preferences (comma-separated) | `veg,mixed` |

### **Date Parameters**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startsAfter` | datetime | Events after date | `2024-01-01T00:00:00Z` |
| `startsBefore` | datetime | Events before date | `2024-12-31T23:59:59Z` |

## 🔍 **Search Examples**

### **Location-Based Search**
```bash
# Search nearby events within 25km
curl "http://localhost:3000/api/v1/events?lat=37.7749&lon=-122.4194&radius_km=25"

# Search by city name
curl "http://localhost:3000/api/v1/events?near=San Francisco&is_public=true"

# Combined location + text + diet filters
curl "http://localhost:3000/api/v1/events?lat=37.7749&lon=-122.4194&q=potluck&diet=veg&is_public=true"
```

### **Discovery Search**
```bash
# Find all public events
curl "http://localhost:3000/api/v1/events?is_public=true"

# Search public events by text
curl "http://localhost:3000/api/v1/events?q=community&is_public=true"

# Filter by dietary preferences
curl "http://localhost:3000/api/v1/events?diet=veg,mixed&is_public=true"
```

### **Traditional Search**
```bash
# User's events only
curl "http://localhost:3000/api/v1/events?status=published"

# My hosted events
curl "http://localhost:3000/api/v1/events?ownership=mine"

# Events I'm invited to
curl "http://localhost:3000/api/v1/events?ownership=invited"
```

## 📊 **Response Format**

All search modes return the same response format:

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Community Potluck",
      "event_date": "2024-01-15T18:00:00Z",
      "attendee_count": 12,
      "meal_type": "mixed",
      "ownership": "invited",
      "viewer_role": "guest"
    }
  ],
  "totalCount": 25,
  "nextOffset": 20
}
```

## ⚡ **Performance Features**

### **PostGIS Integration**
- Geographic indexes for fast spatial queries
- Distance calculations using PostGIS functions
- Optimized radius-based filtering

### **Smart Query Routing**
- Automatic mode detection
- Efficient database queries per mode
- Minimal data transfer

### **Caching Strategy**
- User location cached in profiles
- Event location data indexed
- Pagination for large result sets

## 🛡️ **Validation & Error Handling**

### **Input Validation**
- **Coordinates**: Latitude (-90 to 90), Longitude (-180 to 180)
- **Radius**: 1 to 200 km
- **Pagination**: Limit 1-100, Offset ≥0
- **Status**: Valid enum values
- **Dates**: ISO 8601 format

### **Error Responses**
```json
// Validation Error
{
  "ok": false,
  "error": "Invalid query parameters",
  "details": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["lat"],
      "message": "Invalid latitude"
    }
  ]
}

// Server Error
{
  "ok": false,
  "error": "Failed to perform location-based search"
}
```

## 🔧 **Implementation Details**

### **Search Mode Detection**
```typescript
const isLocationSearch = (lat && lon) || near;
const isDiscoveryMode = is_public === true || isLocationSearch;

if (isLocationSearch) {
  return performLocationBasedSearch();
} else if (isDiscoveryMode) {
  return performDiscoverySearch();
} else {
  return performTraditionalSearch();
}
```

### **PostGIS Functions Used**
- `find_nearby_events()` - Geographic proximity search
- `find_nearby_users_for_notification()` - User discovery
- `update_user_location()` - Location management

### **Database Schema**
- **Events**: `location_geog`, `visibility_radius_km`, `city`
- **User Profiles**: `home_geog`, `discoverability_enabled`, `discoverability_radius_km`
- **Indexes**: GIST indexes on geography columns

## 🚀 **Migration Guide**

### **From Separate Discovery Endpoints**
The integrated search replaces the need for separate discovery endpoints:

**Before:**
```bash
# Separate endpoints
GET /api/v1/discovery/events/nearby?lat=37.7749&lon=-122.4194
GET /api/v1/discovery/events/city?city=San Francisco
GET /api/v1/discovery/events/popular
```

**After:**
```bash
# Single integrated endpoint
GET /api/v1/events?lat=37.7749&lon=-122.4194
GET /api/v1/events?near=San Francisco&is_public=true
GET /api/v1/events?is_public=true
```

### **Backward Compatibility**
- All existing query parameters work unchanged
- Traditional search mode maintains original behavior
- No breaking changes to existing clients

## 📈 **Usage Statistics**

The integrated search provides:
- **3 search modes** in a single endpoint
- **12 query parameters** for flexible filtering
- **PostGIS performance** for location queries
- **Unified response format** across all modes
- **Comprehensive validation** with detailed error messages

## 🔮 **Future Enhancements**

1. **Full-Text Search**: PostgreSQL full-text search for better text queries
2. **Fuzzy Matching**: Approximate string matching for city names
3. **Caching**: Redis caching for frequent location queries
4. **Analytics**: Search analytics and popular locations
5. **Recommendations**: ML-based event recommendations
6. **Real-time Updates**: WebSocket updates for new nearby events

## 🧪 **Testing**

### **Unit Tests**
- Parameter validation
- Search mode detection
- Error handling

### **Integration Tests**
- Database queries
- PostGIS functions
- API responses

### **Performance Tests**
- Large dataset queries
- Concurrent requests
- Memory usage

## 📚 **Related Documentation**

- [Location Discovery System](./LOCATION_DISCOVERY_README.md) - Detailed location features
- [Database Migrations](./db/migrations/) - Schema changes
- [API Documentation](./docs/api-spec.md) - Complete API reference

---

The integrated location-based search provides a powerful, unified interface for event discovery while maintaining backward compatibility and performance. Users can seamlessly search by location, discover public events, or manage their personal events through a single, intuitive endpoint.
