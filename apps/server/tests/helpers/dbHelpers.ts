import { testSupabase, TEST_USERS } from '../setup';
import { faker } from '@faker-js/faker';
import logger from '../../src/logger';

/**
 * Database helper functions for test setup and assertions
 */
export class DbTestHelper {
  
  /**
   * Insert test event and return its ID
   */
  static async insertTestEvent(hostUserId: string = TEST_USERS.HOST.id, overrides: any = {}) {
    const eventData = {
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      event_date: faker.date.future().toISOString(),
      min_guests: 5,
      max_guests: 20,
      meal_type: 'mixed',
      status: 'draft',
      created_by: hostUserId,
      attendee_count: 1,
      location_id: await this.insertTestLocation(),
      ...overrides
    };

    const { data, error } = await testSupabase
      .from('events')
      .insert(eventData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert test event: ${error.message}`);
    }

    return data;
  }

  /**
   * Insert test location and return its ID
   */
  static async insertTestLocation(overrides: any = {}) {
    const locationData = {
      name: faker.company.name() + ' Hall',
      formatted_address: faker.location.streetAddress(),
      latitude: parseFloat(String(faker.location.latitude() as any)),
      longitude: parseFloat(String(faker.location.longitude() as any)),
      ...overrides
    };

    const { data, error } = await testSupabase
      .from('locations')
      .insert(locationData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to insert test location: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Insert test participant and return the record
   */
  static async insertTestParticipant(eventId: string, userId: string, status = 'accepted') {
    const participantData = {
      event_id: eventId,
      user_id: userId,
      status,
      joined_at: new Date().toISOString()
    };

    const { data, error } = await testSupabase
      .from('event_participants')
      .insert(participantData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert test participant: ${error.message}`);
    }

    return data;
  }

  /**
   * Insert test item and return the record
   */
  static async insertTestItem(eventId: string, overrides: any = {}) {
    const itemData = {
      event_id: eventId,
      name: faker.lorem.words(2),
      category: faker.helpers.arrayElement(['appetizer', 'main', 'side', 'dessert']),
      per_guest_qty: 1.0,
      required_qty: 10,
      ...overrides
    };

    const { data, error } = await testSupabase
      .from('event_items')
      .insert(itemData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert test item: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a complete test scenario with event, participants, and items
   */
  static async createEventScenario(hostUserId: string = TEST_USERS.HOST.id) {
    // Create event
    const event = await this.insertTestEvent(hostUserId, { status: 'published' });
    
    // Add host as participant
    const hostParticipant = await this.insertTestParticipant(event.id, hostUserId, 'accepted');
    
    // Add other participants
    const participant2 = await this.insertTestParticipant(event.id, TEST_USERS.PARTICIPANT.id, 'accepted');
    const participant3 = await this.insertTestParticipant(event.id, TEST_USERS.OUTSIDER.id, 'pending');
    
    // Add items
    const item1 = await this.insertTestItem(event.id, { name: 'Main Course', category: 'main' });
    const item2 = await this.insertTestItem(event.id, { name: 'Appetizer', category: 'appetizer' });
    const item3 = await this.insertTestItem(event.id, { name: 'Dessert', category: 'dessert' });

    return {
      event,
      participants: [hostParticipant, participant2, participant3],
      items: [item1, item2, item3]
    };
  }

  /**
   * Assert that an event exists with specific properties
   */
  static async assertEventExists(eventId: string, expectedProperties: any = {}) {
    const { data, error } = await testSupabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      throw new Error(`Event ${eventId} not found: ${error.message}`);
    }

    for (const [key, value] of Object.entries(expectedProperties)) {
      if (data[key] !== value) {
        throw new Error(`Expected event.${key} to be ${value}, got ${data[key]}`);
      }
    }

    return data;
  }

  /**
   * Assert that a participant exists for an event
   */
  static async assertParticipantExists(eventId: string, userId: string, expectedStatus?: string) {
    const { data, error } = await testSupabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Participant ${userId} not found in event ${eventId}: ${error.message}`);
    }

    if (expectedStatus && data.status !== expectedStatus) {
      throw new Error(`Expected participant status to be ${expectedStatus}, got ${data.status}`);
    }

    return data;
  }

  /**
   * Assert that an item is assigned to a specific user
   */
  static async assertItemAssignment(itemId: string, userId: string | null) {
    const { data, error } = await testSupabase
      .from('event_items')
      .select('assigned_to')
      .eq('id', itemId)
      .single();

    if (error) {
      throw new Error(`Item ${itemId} not found: ${error.message}`);
    }

    if (data.assigned_to !== userId) {
      throw new Error(`Expected item to be assigned to ${userId}, got ${data.assigned_to}`);
    }

    return data;
  }

  /**
   * Count records in a table with optional filters
   */
  static async countRecords(tableName: string, filters: Record<string, any> = {}) {
    let query = testSupabase.from(tableName).select('id', { count: 'exact' });
    
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { count, error } = await query;
    
    if (error) {
      throw new Error(`Failed to count records in ${tableName}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Clean specific test data by pattern
   */
  static async cleanTestData(pattern: string) {
    logger.debug(`[DB-HELPER] Cleaning test data with pattern: ${pattern}`);
    
    const tables = ['events', 'event_participants', 'event_items', 'locations'];
    
    for (const table of tables) {
      const { error } = await testSupabase
        .from(table)
        .delete()
        .like('title', `%${pattern}%`)
        .or(`name.like.%${pattern}%`);
      
      if (error && !error.message.includes('does not exist')) {
        logger.warn(`[DB-HELPER] Error cleaning ${table}:`, error.message);
      }
    }
  }

  /**
   * Insert billing plan for subscription tests
   */
  static async insertTestBillingPlan(overrides: any = {}) {
    const planData = {
      price_id: `price_test_${faker.string.alphanumeric(10)}`,
      provider: 'lemonsqueezy', // Updated default
      name: faker.helpers.arrayElement(['Basic', 'Premium', 'Pro']),
      amount_cents: faker.number.int({ min: 999, max: 9999 }),
      currency: 'usd',
      interval: faker.helpers.arrayElement(['month', 'year']),
      is_active: true,
      ...overrides
    };

    const { data, error } = await testSupabase
      .from('billing_plans')
      .insert(planData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert billing plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Insert test subscription for a user
   */
  static async insertTestSubscription(userId: string, planId: string, overrides: any = {}) {
    const subscriptionData = {
      user_id: userId,
      plan_id: planId,
      provider_subscription_id: `sub_test_${faker.string.alphanumeric(10)}`,
      provider: 'lemonsqueezy', // Updated default
      status: 'active',
      current_period_start: faker.date.past().toISOString(),
      current_period_end: faker.date.future().toISOString(),
      ...overrides
    };

    const { data, error } = await testSupabase
      .from('user_subscriptions')
      .insert(subscriptionData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert test subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Insert test payment method for a user
   */
  static async insertTestPaymentMethod(userId: string, overrides: any = {}) {
    const paymentMethodData = {
      user_id: userId,
      provider: 'lemonsqueezy',
      method_id: `pm_test_${faker.string.alphanumeric(10)}`,
      is_default: false,
      brand: 'visa',
      last_four: '4242',
      exp_month: 12,
      exp_year: 2025,
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { data, error } = await testSupabase
      .from('payment_methods')
      .insert(paymentMethodData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert test payment method: ${error.message}`);
    }

    return data;
  }

  /**
   * Insert test invoice for a user
   */
  static async insertTestInvoice(userId: string, subscriptionId?: string, overrides: any = {}) {
    const invoiceData = {
      user_id: userId,
      subscription_id: subscriptionId,
      invoice_id: `inv_test_${faker.string.alphanumeric(10)}`,
      provider: 'lemonsqueezy',
      amount_cents: 1999,
      currency: 'usd',
      status: 'paid',
      invoice_date: faker.date.past().toISOString(),
      paid_date: faker.date.past().toISOString(),
      created_at: faker.date.past().toISOString(),
      ...overrides,
    };

    const { data, error } = await testSupabase
      .from('invoices')
      .insert(invoiceData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert test invoice: ${error.message}`);
    }

    return data;
  }

  /**
   * Clean up all billing test data
   */
  static async cleanupBilling() {
    await testSupabase.from('invoices').delete().neq('id', 'keep-all');
    await testSupabase.from('payment_methods').delete().neq('id', 'keep-all');
    await testSupabase.from('user_subscriptions').delete().neq('id', 'keep-all');
    await testSupabase.from('billing_plans').delete().neq('id', 'keep-all');
  }

  /**
   * Clean up all test data (extended version)
   */
  static async cleanupAll() {
    await this.cleanupBilling();
    await testSupabase.from('event_participants').delete().neq('id', 'keep-all');
    await testSupabase.from('event_items').delete().neq('id', 'keep-all');  
    await testSupabase.from('events').delete().neq('id', 'keep-all');
    await testSupabase.from('locations').delete().neq('id', 'keep-all');
  }
}

export default DbTestHelper;
