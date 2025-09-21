#!/usr/bin/env node
import 'dotenv/config';
import { hardDeleteEventCascade, hardDeleteByCreator } from '../helpers/admin-cleanup.mjs';

const API = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  const data = await res.json();
  return data.session.access_token;
}

function jwtSub(token) {
  try { 
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub; 
  } catch { 
    return null; 
  }
}

async function authed(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return res;
}

async function main() {
  console.log('🧪 Testing Events API Location Data Verification...');
  
  const hostEmail = process.env.HOST_EMAIL || 'host@test.dev';
  const pass = process.env.HOST_PASSWORD || 'password123';

  const host = await login(hostEmail, pass);
  const hostId = jwtSub(host) || '11111111-1111-1111-1111-111111111111';

  // Create test event with location
  const eventPayload = {
    title: 'Location Verification Test Event',
    description: 'Testing that location data is returned in events API',
    event_date: new Date(Date.now() + 7*24*3600*1000).toISOString(),
    min_guests: 3,
    max_guests: 15,
    meal_type: 'mixed',
    is_public: true,
    location: { 
      name: 'Test Community Center', 
      formatted_address: '789 Test Ave, Test City, TC 98765' 
    },
    items: [ 
      { name: 'Main Course', category: 'main', per_guest_qty: 1 },
      { name: 'Side Dish', category: 'side', per_guest_qty: 0.5 }
    ]
  };

  let res = await authed('POST', '/events', host, eventPayload);
  if (res.status !== 201) throw new Error(`create event failed ${res.status} ${await res.text()}`);
  const created = await res.json();
  const eventId = created.event.id;
  console.log(`✅ Created test event: ${eventId}`);

  try {
    // Publish the event
    res = await authed('POST', `/events/${eventId}/publish`, host);
    if (!res.ok) throw new Error(`publish failed ${res.status}`);
    console.log('✅ Event published');

    // Test 1: List events and verify location data is present
    console.log('\n📝 Test 1: List events and verify location data');
    res = await authed('GET', '/events?limit=10&offset=0&status=published&ownership=all', host);
    if (!res.ok) throw new Error(`list events failed ${res.status}`);
    
    const eventsData = await res.json();
    console.log(`📊 Found ${eventsData.items.length} events`);
    
    // Check if any event has location data
    const hasLocationData = eventsData.items.some(item => item.location);
    if (!hasLocationData) {
      throw new Error('❌ No events have location data');
    }
    console.log('✅ Location data found in events');

    // Find our test event and verify its location data
    const testEvent = eventsData.items.find(item => item.title === 'Location Verification Test Event');
    if (!testEvent) {
      throw new Error('❌ Test event not found in list');
    }
    console.log('✅ Test event found in list');

    // Verify location data structure
    if (!testEvent.location) {
      throw new Error('❌ Test event missing location data');
    }
    
    const location = testEvent.location;
    const requiredFields = ['id', 'name', 'formatted_address'];
    const missingFields = requiredFields.filter(field => !location[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`❌ Location data missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ Location data structure is correct');
    console.log(`   Location ID: ${location.id}`);
    console.log(`   Location Name: ${location.name}`);
    console.log(`   Address: ${location.formatted_address}`);
    console.log(`   Coordinates: ${location.latitude || 'null'}, ${location.longitude || 'null'}`);

    // Test 2: Verify location data in individual event details
    console.log('\n📝 Test 2: Verify location in event details');
    res = await authed('GET', `/events/${eventId}`, host);
    if (!res.ok) throw new Error(`get event details failed ${res.status}`);
    
    const eventDetails = await res.json();
    if (!eventDetails.event.location) {
      throw new Error('❌ Event details missing location data');
    }
    
    const detailLocation = eventDetails.event.location;
    if (detailLocation.name !== 'Test Community Center') {
      throw new Error('❌ Event details location name mismatch');
    }
    console.log('✅ Event details include correct location data');

    // Test 3: Verify location data in different ownership filters
    console.log('\n📝 Test 3: Verify location data in different ownership filters');
    
    // Test "mine" filter
    res = await authed('GET', '/events?ownership=mine&status=published', host);
    if (!res.ok) throw new Error(`mine filter failed ${res.status}`);
    const mineData = await res.json();
    const mineHasLocation = mineData.items.some(item => item.location);
    if (!mineHasLocation) {
      throw new Error('❌ Mine filter events missing location data');
    }
    console.log('✅ Mine filter includes location data');

    // Test "all" filter
    res = await authed('GET', '/events?ownership=all&status=published', host);
    if (!res.ok) throw new Error(`all filter failed ${res.status}`);
    const allData = await res.json();
    const allHasLocation = allData.items.some(item => item.location);
    if (!allHasLocation) {
      throw new Error('❌ All filter events missing location data');
    }
    console.log('✅ All filter includes location data');

    console.log('\n🎉 All location verification tests passed!');
    console.log('✅ Events API consistently returns location data');
    console.log('✅ Location data structure is correct');
    console.log('✅ Location data works across all ownership filters');

  } finally {
    // Clean up test event
    try { 
      await authed('POST', `/events/${eventId}/cancel`, host, { reason: 'test-cleanup', notifyGuests: false }); 
    } catch {}
    try { 
      await authed('POST', `/events/${eventId}/purge`, host); 
    } catch {}
    try { 
      await hardDeleteEventCascade(eventId); 
    } catch {}
    try { 
      await hardDeleteByCreator(hostId); 
    } catch {}
    console.log('🧹 Test cleanup completed');
  }
}

main().catch((e) => { 
  console.error('❌ Test failed:', e.message); 
  process.exit(1); 
});
