-- Location-Based Event Discovery Migration
-- Adds PostGIS support and location-based discovery features
-- 
-- This migration:
-- 1. Enables PostGIS extension
-- 2. Adds location columns to events and user_profiles tables
-- 3. Creates geographic indexes for performance
-- 4. Adds discoverability settings for users
-- 5. Creates helper functions for location-based queries

BEGIN;

-- ===============================================
-- 1. Enable PostGIS extension
-- ===============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===============================================
-- 2. Add location columns to events table
-- ===============================================
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS location_geog geography(Point, 4326),
ADD COLUMN IF NOT EXISTS visibility_radius_km integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS city text;

-- Add constraint for visibility radius
ALTER TABLE public.events 
ADD CONSTRAINT events_visibility_radius_positive 
CHECK (visibility_radius_km >= 1 AND visibility_radius_km <= 500);

-- ===============================================
-- 3. Add location and discoverability columns to user_profiles
-- ===============================================
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS home_geog geography(Point, 4326),
ADD COLUMN IF NOT EXISTS discoverability_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS discoverability_radius_km integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS geo_precision text DEFAULT 'city' CHECK (geo_precision IN ('exact', 'city'));

-- Add constraint for discoverability radius
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_discoverability_radius_positive 
CHECK (discoverability_radius_km >= 1 AND discoverability_radius_km <= 200);

-- ===============================================
-- 4. Create geographic indexes for performance
-- ===============================================
CREATE INDEX IF NOT EXISTS events_location_gix 
ON public.events USING GIST (location_geog);

CREATE INDEX IF NOT EXISTS user_profiles_home_gix 
ON public.user_profiles USING GIST (home_geog);

-- ===============================================
-- 5. Create helper function to populate location_geog from lat/lng
-- ===============================================
CREATE OR REPLACE FUNCTION update_event_location_geog()
RETURNS TRIGGER AS $$
BEGIN
  -- If latitude and longitude are provided, create geography point
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_geog = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate location_geog
DROP TRIGGER IF EXISTS trigger_update_event_location_geog ON public.events;
CREATE TRIGGER trigger_update_event_location_geog
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_location_geog();

-- ===============================================
-- 6. Create function to find nearby events
-- ===============================================
CREATE OR REPLACE FUNCTION find_nearby_events(
  user_lat double precision,
  user_lon double precision,
  radius_km integer DEFAULT 25,
  limit_count integer DEFAULT 25,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  event_date timestamptz,
  city text,
  distance_m double precision,
  is_public boolean,
  status text,
  capacity_total integer,
  attendee_count integer
) 
LANGUAGE sql
STABLE
AS $$
  WITH user_point AS (
    SELECT ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography as geom,
           radius_km * 1000 as radius_m
  )
  SELECT 
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.city,
    ST_Distance(e.location_geog, up.geom) as distance_m,
    e.is_public,
    e.status,
    e.capacity_total,
    e.attendee_count
  FROM public.events e, user_point up
  WHERE e.status = 'published'
    AND e.is_public = true
    AND e.location_geog IS NOT NULL
    AND ST_DWithin(e.location_geog, up.geom, up.radius_m)
  ORDER BY distance_m ASC, e.event_date ASC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- ===============================================
-- 7. Create function to find users for event notifications
-- ===============================================
CREATE OR REPLACE FUNCTION find_nearby_users_for_notification(
  event_id uuid
)
RETURNS TABLE(
  user_id uuid,
  distance_m double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH event_location AS (
    SELECT location_geog, visibility_radius_km
    FROM public.events 
    WHERE id = event_id 
      AND status = 'published' 
      AND is_public = true
      AND location_geog IS NOT NULL
  )
  SELECT 
    up.user_id,
    ST_Distance(up.home_geog, el.location_geog) as distance_m
  FROM public.user_profiles up, event_location el
  WHERE up.discoverability_enabled = true
    AND up.home_geog IS NOT NULL
    AND ST_DWithin(
      up.home_geog, 
      el.location_geog, 
      LEAST(up.discoverability_radius_km, el.visibility_radius_km) * 1000
    );
$$;

-- ===============================================
-- 8. Create function to update user location from lat/lng
-- ===============================================
CREATE OR REPLACE FUNCTION update_user_location(
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_city text DEFAULT NULL,
  p_geo_precision text DEFAULT 'city'
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate geo_precision
  IF p_geo_precision NOT IN ('exact', 'city') THEN
    RAISE EXCEPTION 'Invalid geo_precision: %', p_geo_precision;
  END IF;
  
  -- Update user profile with location
  UPDATE public.user_profiles 
  SET 
    home_geog = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    city = COALESCE(p_city, city),
    geo_precision = p_geo_precision,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- ===============================================
-- 9. Create function to get event availability with location
-- ===============================================
CREATE OR REPLACE FUNCTION get_event_with_location(event_uuid uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  event_date timestamptz,
  city text,
  latitude double precision,
  longitude double precision,
  is_public boolean,
  status text,
  capacity_total integer,
  attendee_count integer,
  available_spots integer
)
LANGUAGE sql
STABLE
AS $$
  WITH availability AS (
    SELECT * FROM availability_for_event(event_uuid)
  )
  SELECT 
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.city,
    ST_Y(e.location_geog::geometry) as latitude,
    ST_X(e.location_geog::geometry) as longitude,
    e.is_public,
    e.status,
    e.capacity_total,
    e.attendee_count,
    av.available
  FROM public.events e
  CROSS JOIN availability av
  WHERE e.id = event_uuid;
$$;

-- ===============================================
-- 10. Add helpful comments
-- ===============================================
COMMENT ON COLUMN public.events.location_geog IS 'Geographic point for event location (PostGIS)';
COMMENT ON COLUMN public.events.visibility_radius_km IS 'Maximum distance to advertise this event (km)';
COMMENT ON COLUMN public.events.city IS 'City name for display purposes';

COMMENT ON COLUMN public.user_profiles.home_geog IS 'User home location (PostGIS)';
COMMENT ON COLUMN public.user_profiles.discoverability_enabled IS 'Whether user wants to discover nearby events';
COMMENT ON COLUMN public.user_profiles.discoverability_radius_km IS 'User preferred discovery radius (km)';
COMMENT ON COLUMN public.user_profiles.geo_precision IS 'Location precision preference: exact or city-level';

COMMENT ON FUNCTION find_nearby_events(double precision, double precision, integer, integer, integer) 
IS 'Find published events within radius of user location, sorted by distance';

COMMENT ON FUNCTION find_nearby_users_for_notification(uuid) 
IS 'Find users who should be notified about a new nearby event';

COMMENT ON FUNCTION update_user_location(uuid, double precision, double precision, text, text) 
IS 'Update user location from latitude/longitude coordinates';

COMMENT ON FUNCTION get_event_with_location(uuid) 
IS 'Get event details including location coordinates and availability';

COMMIT;