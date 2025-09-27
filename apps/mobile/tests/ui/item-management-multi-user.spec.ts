import { test, expect } from '@playwright/test';
import { 
  setupMultiUserItemScenario,
  claimItem,
  unclaimItem,
  verifyItemClaimedBy,
  verifyItemQuantity,
  navigateToItemsTab,
  EVENT_TEMPLATES,
  ITEM_TEMPLATES
} from './item-management-utilities';

test.describe('Item Management - Multi-User Scenarios', () => {
  test('should handle multiple guests claiming different items', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();
    
    try {
      // Setup multi-user scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guest1Page, guest2Page], 
        EVENT_TEMPLATES.SMALL_DINNER
      );
      
      // Guest 1 claims main course
      await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      
      // Guest 2 claims side dish
      await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
      
      // Verify claims from host perspective
      await navigateToItemsTab(hostPage);
      
      const mainCourseClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1');
      const sideDishClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 2');
      
      expect(mainCourseClaimed).toBe(true);
      expect(sideDishClaimed).toBe(true);
      
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
    }
  });

  test('should handle guest claiming multiple items', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    
    try {
      // Setup scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guestPage], 
        EVENT_TEMPLATES.SMALL_DINNER
      );
      
      // Guest claims multiple items
      await claimItem(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      await claimItem(guestPage, ITEM_TEMPLATES.SIDE_DISH.name, 1);
      await claimItem(guestPage, ITEM_TEMPLATES.DESSERT.name, 1);
      
      // Verify all items are claimed by the same guest
      await navigateToItemsTab(hostPage);
      
      const mainCourseClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1');
      const sideDishClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 1');
      const dessertClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.DESSERT.name, 'Guest 1');
      
      expect(mainCourseClaimed).toBe(true);
      expect(sideDishClaimed).toBe(true);
      expect(dessertClaimed).toBe(true);
      
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('should handle item quantity adjustments', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    
    try {
      // Setup scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guestPage], 
        EVENT_TEMPLATES.SMALL_DINNER
      );
      
      // Guest claims 2 of the same item
      await claimItem(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 2);
      
      // Verify quantity
      const quantityCorrect = await verifyItemQuantity(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 2);
      expect(quantityCorrect).toBe(true);
      
      // Reduce quantity
      await unclaimItem(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      
      // Verify reduced quantity
      const reducedQuantityCorrect = await verifyItemQuantity(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      expect(reducedQuantityCorrect).toBe(true);
      
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('should handle concurrent item claiming', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();
    
    try {
      // Setup scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guest1Page, guest2Page], 
        EVENT_TEMPLATES.SMALL_DINNER
      );
      
      // Both guests try to claim the same item simultaneously
      const claimPromises = [
        claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1),
        claimItem(guest2Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1)
      ];
      
      await Promise.all(claimPromises);
      
      // Verify only one guest successfully claimed the item
      await navigateToItemsTab(hostPage);
      
      const mainCourseClaimedByGuest1 = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1');
      const mainCourseClaimedByGuest2 = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 2');
      
      // Only one should be true
      const totalClaims = (mainCourseClaimedByGuest1 ? 1 : 0) + (mainCourseClaimedByGuest2 ? 1 : 0);
      expect(totalClaims).toBe(1);
      
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
    }
  });
});