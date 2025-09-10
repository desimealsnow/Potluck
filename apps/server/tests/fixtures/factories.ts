import { faker } from '@faker-js/faker';
import { components } from '../../../../libs/common/src/types.gen';

// Type definitions from OpenAPI spec
type EventCreate = components['schemas']['EventCreate'];
type ItemCreate = components['schemas']['ItemCreate'];
type Location = components['schemas']['Location'];
type ParticipantAdd = components['schemas']['ParticipantAdd'];
type EventCancel = components['schemas']['EventCancel'];
type BillingPlan = components['schemas']['BillingPlan'];

/**
 * Base Factory class for consistent data generation
 */
abstract class Factory<T> {
  /**
   * Build a single instance with optional overrides
   */
  abstract build(overrides?: Partial<T>): T;

  /**
   * Build multiple instances
   */
  buildList(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build with deterministic seed for reproducible tests
   */
  buildSeeded(seed: number, overrides?: Partial<T>): T {
    faker.seed(seed);
    const result = this.build(overrides);
    faker.seed(); // Reset to random
    return result;
  }
}

/**
 * Location factory for generating test locations
 */
export class LocationFactory extends Factory<Location> {
  build(overrides?: Partial<Location>): Location {
    const city = faker.location.city();
    const state = faker.location.state();
    
    return {
      name: faker.company.name() + ' ' + faker.helpers.arrayElement(['Restaurant', 'Park', 'Hall', 'Center']),
      formatted_address: `${faker.location.streetAddress()}, ${city}, ${state} ${faker.location.zipCode()}`,
      latitude: parseFloat(faker.location.latitude({ min: 25, max: 48 })),
      longitude: parseFloat(faker.location.longitude({ min: -125, max: -66 })),
      ...overrides
    };
  }

  /**
   * Generate popular venue types
   */
  static buildPopular(): Location {
    const venues = [
      'Community Center',
      'Local Park Pavilion', 
      'Church Fellowship Hall',
      'Neighborhood Restaurant',
      'Public Library Meeting Room'
    ];

    return new LocationFactory().build({
      name: faker.helpers.arrayElement(venues)
    });
  }
}

/**
 * Item factory for generating food items
 */
export class ItemFactory extends Factory<ItemCreate> {
  build(overrides?: Partial<ItemCreate>): ItemCreate {
    const categories = ['appetizer', 'main', 'side', 'dessert', 'drink'];
    const foods = {
      appetizer: ['Chips & Dip', 'Veggie Tray', 'Cheese Platter', 'Stuffed Mushrooms'],
      main: ['Grilled Chicken', 'Pasta Salad', 'BBQ Ribs', 'Vegetarian Lasagna'],
      side: ['Caesar Salad', 'Garlic Bread', 'Roasted Vegetables', 'Rice Pilaf'],
      dessert: ['Chocolate Cake', 'Apple Pie', 'Ice Cream', 'Fruit Salad'],
      drink: ['Soft Drinks', 'Iced Tea', 'Coffee', 'Fresh Juice']
    };

    const category = faker.helpers.arrayElement(categories);
    const name = faker.helpers.arrayElement(foods[category as keyof typeof foods]);

    return {
      name,
      category,
      per_guest_qty: parseFloat(faker.number.float({ min: 0.1, max: 2.0, fractionDigits: 1 }).toFixed(1)),
      ...overrides
    };
  }

  /**
   * Generate complete meal set
   */
  static buildMealSet(): ItemCreate[] {
    return [
      new ItemFactory().build({ category: 'appetizer', name: 'Welcome Snacks' }),
      new ItemFactory().build({ category: 'main', name: 'Main Course' }),
      new ItemFactory().build({ category: 'side', name: 'Side Dish' }),
      new ItemFactory().build({ category: 'dessert', name: 'Dessert' }),
      new ItemFactory().build({ category: 'drink', name: 'Beverages' })
    ];
  }
}

/**
 * Event factory for generating potluck events
 */
export class EventFactory extends Factory<EventCreate> {
  build(overrides?: Partial<EventCreate>): EventCreate {
    const eventDate = faker.date.future({ years: 1 });
    const minGuests = faker.number.int({ min: 5, max: 15 });
    const maxGuests = faker.number.int({ min: minGuests + 5, max: 50 });
    
    const occasions = [
      'Holiday Party',
      'Birthday Celebration', 
      'Community Gathering',
      'Neighborhood BBQ',
      'Graduation Party',
      'Retirement Send-off',
      'Welcome Party'
    ];

    return {
      title: faker.helpers.arrayElement(occasions) + ' - ' + faker.date.month(),
      description: faker.lorem.paragraph({ min: 2, max: 4 }),
      event_date: eventDate.toISOString(),
      min_guests: minGuests,
      max_guests: maxGuests,
      meal_type: faker.helpers.arrayElement(['veg', 'nonveg', 'mixed']),
      location: new LocationFactory().build(),
      items: new ItemFactory().buildList(faker.number.int({ min: 3, max: 6 })),
      ...overrides
    };
  }

  /**
   * Generate draft event
   */
  static buildDraft(overrides?: Partial<EventCreate>): EventCreate {
    return new EventFactory().build({
      title: '[DRAFT] ' + faker.lorem.words(3),
      ...overrides
    });
  }

  /**
   * Generate published event ready for participants
   */
  static buildPublished(overrides?: Partial<EventCreate>): EventCreate {
    return new EventFactory().build({
      event_date: faker.date.future({ years: 0.5 }).toISOString(),
      min_guests: 8,
      max_guests: 25,
      ...overrides
    });
  }
}

/**
 * Participant factory for event participation
 */
export class ParticipantFactory extends Factory<ParticipantAdd> {
  build(overrides?: Partial<ParticipantAdd>): ParticipantAdd {
    return {
      user_id: faker.string.uuid(),
      status: faker.helpers.arrayElement(['invited', 'pending', 'accepted', 'declined', 'maybe']),
      ...overrides
    };
  }

  /**
   * Generate accepted participant
   */
  static buildAccepted(userId?: string): ParticipantAdd {
    return new ParticipantFactory().build({
      user_id: userId || faker.string.uuid(),
      status: 'accepted'
    });
  }

  /**
   * Generate pending invitation
   */
  static buildPending(userId?: string): ParticipantAdd {
    return new ParticipantFactory().build({
      user_id: userId || faker.string.uuid(),
      status: 'invited'
    });
  }
}

/**
 * Event cancellation factory
 */
export class EventCancelFactory extends Factory<EventCancel> {
  build(overrides?: Partial<EventCancel>): EventCancel {
    const reasons = [
      'Unexpected family emergency',
      'Weather conditions unsafe',
      'Venue no longer available', 
      'Not enough participants',
      'Host illness',
      'Scheduling conflict arose'
    ];

    return {
      reason: faker.helpers.arrayElement(reasons),
      notifyGuests: faker.datatype.boolean(),
      ...overrides
    };
  }
}

/**
 * Billing plan factory
 */
export class BillingPlanFactory extends Factory<BillingPlan> {
  build(overrides?: Partial<BillingPlan>): BillingPlan {
    const plans = [
      { name: 'Basic', amount: 999, interval: 'month' as const },
      { name: 'Premium', amount: 1999, interval: 'month' as const },
      { name: 'Pro', amount: 9999, interval: 'year' as const }
    ];
    
    const plan = faker.helpers.arrayElement(plans);
    
    return {
      id: `price_${faker.string.alphanumeric(24)}`,
      price_id: `price_${faker.string.alphanumeric(24)}`,
      provider: 'stripe',
      name: plan.name,
      amount_cents: plan.amount,
      currency: 'usd',
      interval: plan.interval,
      is_active: true,
      created_at: faker.date.past().toISOString(),
      ...overrides
    };
  }
}

/**
 * Test data sets for common scenarios
 */
export class TestDataSets {
  /**
   * Complete event with participants and items
   */
  static completeEventScenario() {
    const event = EventFactory.buildPublished();
    const participants = [
      ParticipantFactory.buildAccepted(),
      ParticipantFactory.buildAccepted(), 
      ParticipantFactory.buildPending()
    ];
    const additionalItems = ItemFactory.buildMealSet();

    return { event, participants, items: additionalItems };
  }

  /**
   * Minimal valid event for quick testing
   */
  static minimalEvent(): EventCreate {
    return {
      title: 'Test Event',
      description: 'A test event',
      event_date: faker.date.future().toISOString(),
      min_guests: 2,
      max_guests: 10,
      meal_type: 'mixed',
      location: {
        name: 'Test Location',
        formatted_address: '123 Test St, Test City, TS 12345'
      },
      items: [
        {
          name: 'Test Item',
          category: 'main',
          per_guest_qty: 1.0
        }
      ]
    };
  }

  /**
   * Generate realistic user lifecycle test data
   */
  static userLifecycleData() {
    return {
      hostEvent: EventFactory.build(),
      participantEvents: EventFactory.buildList(3),
      subscriptionPlan: BillingPlanFactory.build()
    };
  }
}

// Export factory instances for convenience
export const eventFactory = new EventFactory();
export const itemFactory = new ItemFactory();
export const locationFactory = new LocationFactory();
export const participantFactory = new ParticipantFactory();
export const eventCancelFactory = new EventCancelFactory();
export const billingPlanFactory = new BillingPlanFactory();

/**
 * Utility to seed faker for deterministic tests
 */
export function seedFaker(seed: number): void {
  faker.seed(seed);
}

/**
 * Reset faker to random mode
 */
export function resetFaker(): void {
  faker.seed();
}
