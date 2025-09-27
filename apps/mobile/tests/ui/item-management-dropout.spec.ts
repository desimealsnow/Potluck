import { test, expect } from '@playwright/test';
import { 
  setupMultiUserItemScenario,
  claimItem,
  verifyItemClaimedBy,
  simulateParticipantDropout,
  rebalanceItems,
  navigateToItemsTab,
  EVENT_TEMPLATES,
  ITEM_TEMPLATES
} from './item-management-utilities';

test.describe('Item Management - Participant Dropout Scenarios', () => {
  test('should handle participant dropout and item rebalancing', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();
    
    try {
      // Setup scenario with multiple guests
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guest1Page, guest2Page], 
        EVENT_TEMPLATES.LARGE_POTLUCK
      );
      
      // Guests claim items
      await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
      
      // Verify initial claims
      await navigateToItemsTab(hostPage);
      const mainCourseClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1');
      const sideDishClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 2');
      
      expect(mainCourseClaimed).toBe(true);
      expect(sideDishClaimed).toBe(true);
      
      // Simulate participant dropout
      await simulateParticipantDropout(hostPage, 'Guest 1');
      
      // Verify item is now unclaimed
      const mainCourseUnclaimed = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1'));
      expect(mainCourseUnclaimed).toBe(true);
      
      // Rebalance items
      await rebalanceItems(hostPage);
      
      // Verify rebalancing completed
      const rebalanceComplete = await hostPage.getByTestId('rebalance-complete-message').isVisible();
      expect(rebalanceComplete).toBe(true);
      
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
    }
  });

  test('should handle multiple participant dropouts', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();
    const guest3Context = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();
    const guest3Page = await guest3Context.newPage();
    
    try {
      // Setup scenario with multiple guests
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guest1Page, guest2Page, guest3Page], 
        EVENT_TEMPLATES.LARGE_POTLUCK
      );
      
      // All guests claim different items
      await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
      await claimItem(guest3Page, ITEM_TEMPLATES.DESSERT.name, 1);
      
      // Simulate multiple dropouts
      await simulateParticipantDropout(hostPage, 'Guest 1');
      await simulateParticipantDropout(hostPage, 'Guest 2');
      
      // Verify items are unclaimed
      const mainCourseUnclaimed = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1'));
      const sideDishUnclaimed = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 2'));
      const dessertStillClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.DESSERT.name, 'Guest 3');
      
      expect(mainCourseUnclaimed).toBe(true);
      expect(sideDishUnclaimed).toBe(true);
      expect(dessertStillClaimed).toBe(true);
      
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
      await guest3Context.close();
    }
  });

  test('should handle partial item claims after dropout', async ({ browser }) => {
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
      
      // Guest 1 claims 2 of the same item
      await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 2);
      
      // Guest 2 claims 1 of the same item
      await claimItem(guest2Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      
      // Verify initial claims
      await navigateToItemsTab(hostPage);
      const mainCourseClaimedByGuest1 = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1');
      const mainCourseClaimedByGuest2 = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 2');
      
      expect(mainCourseClaimedByGuest1).toBe(true);
      expect(mainCourseClaimedByGuest2).toBe(true);
      
      // Guest 1 drops out
      await simulateParticipantDropout(hostPage, 'Guest 1');
      
      // Verify Guest 1's claims are released
      const mainCourseUnclaimedByGuest1 = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1'));
      expect(mainCourseUnclaimedByGuest1).toBe(true);
      
      // Guest 2's claims should still be intact
      const mainCourseStillClaimedByGuest2 = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 2');
      expect(mainCourseStillClaimedByGuest2).toBe(true);
      
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
    }
  });

  test('should handle rebalancing with remaining participants', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();
    const guest3Context = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();
    const guest3Page = await guest3Context.newPage();
    
    try {
      // Setup scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guest1Page, guest2Page, guest3Page], 
        EVENT_TEMPLATES.LARGE_POTLUCK
      );
      
      // All guests claim different items
      await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
      await claimItem(guest3Page, ITEM_TEMPLATES.DESSERT.name, 1);
      
      // Guest 1 drops out
      await simulateParticipantDropout(hostPage, 'Guest 1');
      
      // Rebalance items
      await rebalanceItems(hostPage);
      
      // Verify remaining participants still have their items
      const sideDishStillClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 2');
      const dessertStillClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.DESSERT.name, 'Guest 3');
      
      expect(sideDishStillClaimed).toBe(true);
      expect(dessertStillClaimed).toBe(true);
      
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
      await guest3Context.close();
    }
  });
});