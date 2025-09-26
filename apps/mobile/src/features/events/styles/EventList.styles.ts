import { StyleSheet } from 'react-native';
import { 
  COLORS, 
  SPACING, 
  BORDER_RADIUS, 
  TYPOGRAPHY, 
  SHADOWS, 
  LAYOUT,
  EVENT_LIST_COLORS,
  EVENT_LIST_LAYOUT 
} from '@/shared/theme';

const styles = StyleSheet.create({
  // Layout containers
  mainContentArea: {
    flex: 1,
    flexDirection: 'row',
  },
  
  sidebar: {
    width: EVENT_LIST_LAYOUT.SIDEBAR_WIDTH,
    backgroundColor: EVENT_LIST_COLORS.SIDEBAR_BACKGROUND,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER_PRIMARY,
  },
  
  sidebarHidden: {
    width: 0,
    overflow: 'hidden',
  },
  
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER_PRIMARY,
  },
  
  sidebarTitle: {
    color: EVENT_LIST_COLORS.SIDEBAR_TITLE,
    fontSize: TYPOGRAPHY.XL,
    fontWeight: TYPOGRAPHY.BOLD,
  },
  
  eventsSection: {
    flex: 1,
    backgroundColor: EVENT_LIST_COLORS.EVENTS_SECTION_BACKGROUND,
  },
  
  eventsSectionMobile: {
    width: '100%',
  },
  
  // Search styles
  searchContainer: {
    marginTop: SPACING.MD,
    marginHorizontal: 0,
  },
  
  searchWrap: {
    height: EVENT_LIST_LAYOUT.SEARCH_HEIGHT,
    borderRadius: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    borderColor: COLORS.BORDER_SECONDARY,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.SEARCH,
  },
  
  searchIcon: {
    marginRight: SPACING.MD,
  },
  
  searchInput: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.LG,
    fontWeight: TYPOGRAPHY.MEDIUM,
    paddingVertical: 0,
  },
  
  clearButton: {
    marginLeft: SPACING.SM,
    padding: SPACING.XS,
  },
  
  searchResultsIndicator: {
    marginTop: SPACING.SM,
    marginHorizontal: 0,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND_OVERLAY_DIM,
    borderRadius: SPACING.SM,
    borderLeftWidth: 3,
    borderLeftColor: EVENT_LIST_COLORS.SEARCH_BORDER_LEFT,
  },
  
  searchResultsText: {
    color: EVENT_LIST_COLORS.SEARCH_RESULTS_TEXT,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.MEDIUM,
  },
  
  // Segmented control
  segmentWrap: {
    paddingHorizontal: 0,
    marginTop: SPACING.MD,
  },
  
  tabContainer: {
    backgroundColor: EVENT_LIST_COLORS.EVENTS_SECTION_BACKGROUND,
  },
  
  // Cards
  card: {
    borderRadius: BORDER_RADIUS.XL,
    padding: SPACING.MD,
    marginVertical: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER_QUATERNARY,
    ...SHADOWS.CARD,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  cardTitle: {
    color: COLORS.TEXT_DARK_SECONDARY,
    fontSize: TYPOGRAPHY.XL,
    fontWeight: TYPOGRAPHY.EXTRABOLD,
    flex: 1,
    paddingRight: SPACING.MD,
  },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  
  metaText: {
    color: COLORS.TEXT_DARK_TERTIARY,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
  },
  
  // Footer layout
  footerRow: {
    marginTop: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 64,
  },
  
  footerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  
  footerRight: {
    minWidth: 86,
    alignItems: 'flex-end',
  },
  
  // Avatars
  avatarWrap: {
    width: LAYOUT.AVATAR_SIZE,
    height: LAYOUT.AVATAR_SIZE,
    borderRadius: LAYOUT.AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.BORDER_QUINARY,
    backgroundColor: COLORS.BACKGROUND_OVERLAY_BRIGHTER,
  },
  
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: LAYOUT.AVATAR_SIZE / 2,
  },
  
  // Empty states
  emptyWrap: { 
    alignItems: 'center',
    paddingVertical: SPACING.XXXL,
    paddingHorizontal: SPACING.XXXL,
    backgroundColor: EVENT_LIST_COLORS.EMPTY_STATE_BACKGROUND,
  },
  
  loadingText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.LG,
    marginTop: SPACING.MD,
    fontWeight: TYPOGRAPHY.MEDIUM,
  },
  
  noResultsTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.XXL,
    fontWeight: TYPOGRAPHY.BOLD,
    marginTop: SPACING.LG,
    textAlign: 'center',
  },
  
  noResultsText: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: TYPOGRAPHY.MD,
    marginTop: SPACING.SM,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  clearSearchButton: {
    marginTop: SPACING.XXL,
    paddingHorizontal: SPACING.XXL,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND_OVERLAY_BRIGHT,
    borderRadius: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_TERTIARY,
  },
  
  clearSearchButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
  },
  
  emptyTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.XXL,
    fontWeight: TYPOGRAPHY.BOLD,
    marginTop: SPACING.LG,
    textAlign: 'center',
  },
  
  emptyText: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: TYPOGRAPHY.MD,
    marginTop: SPACING.SM,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // List content
  listContent: {
    paddingHorizontal: SPACING.PAGE_PADDING,
    paddingBottom: SPACING.XXL,
  },
  
  // Action buttons
  actionsContainer: {
    marginTop: SPACING.MD,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.SM,
  },
  
  actionButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.LG,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.BUTTON,
    minWidth: 80,
  },
  
  actionButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.SM,
    fontWeight: TYPOGRAPHY.BOLD,
  },
  
  // Map styles
  mapContainer: {
    width: '100%',
    height: EVENT_LIST_LAYOUT.MAP_HEIGHT,
    borderRadius: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER_TERTIARY,
    overflow: 'hidden',
  },
  
  mapPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.CARD_BACKGROUND_ALT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XXL,
  },
  
  mapPlaceholderTitle: {
    fontSize: TYPOGRAPHY.XL,
    fontWeight: TYPOGRAPHY.BOLD,
    color: EVENT_LIST_COLORS.MAP_PLACEHOLDER_TITLE,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  
  mapPlaceholderText: {
    fontSize: TYPOGRAPHY.MD,
    color: EVENT_LIST_COLORS.MAP_PLACEHOLDER_TEXT,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EVENT_LIST_COLORS.MAP_BUTTON,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: SPACING.SM,
  },
  
  mapButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
    fontSize: TYPOGRAPHY.MD,
    marginLeft: 6,
  },
  
  // Filter styles
  filterToggle: {
    padding: SPACING.SM,
    borderRadius: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND_OVERLAY_DIM,
  },
  
  filterContent: {
    padding: SPACING.SM,
  },
  
  filterSection: {
    marginBottom: SPACING.LG,
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    borderRadius: SPACING.MD,
    padding: SPACING.LG,
  },
  
  filterSectionTitle: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
    marginBottom: SPACING.MD,
  },
  
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  
  // Header styles
  header: {
    paddingHorizontal: 0,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  headerTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.XXXL,
    fontWeight: TYPOGRAPHY.EXTRABOLD,
  },
  
  // Icon button styles
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  iconBtn: {
    width: LAYOUT.ICON_BUTTON_SIZE,
    height: LAYOUT.ICON_BUTTON_SIZE,
    borderRadius: LAYOUT.ICON_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    borderWidth: 1,
    borderColor: COLORS.BORDER_TERTIARY,
    marginLeft: SPACING.SM,
  },
  
  iconBtnAlt: {
    backgroundColor: COLORS.BACKGROUND_OVERLAY_BRIGHTER,
  },
  
  // Badge styles
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: LAYOUT.BADGE_SIZE,
    height: LAYOUT.BADGE_SIZE,
    borderRadius: LAYOUT.BADGE_SIZE / 2,
    backgroundColor: COLORS.ACCENT_ERROR_BADGE_ALT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.BORDER_QUINARY,
  },
  
  badgeText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.XS,
    fontWeight: TYPOGRAPHY.EXTRABOLD,
  },
  
  // Events header styles
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER_PRIMARY,
  },
  
  eventsHeaderLeft: {
    flex: 1,
  },
  
  eventsTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.XXL,
    fontWeight: TYPOGRAPHY.BOLD,
  },
  
  eventsSubtitle: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: TYPOGRAPHY.MD,
    marginTop: 2,
  },
  
  eventsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_OVERLAY_BRIGHT,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: SPACING.SM,
  },
  
  createEventButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
    marginLeft: 6,
  },
  
  // Filter toggle styles
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_OVERLAY_DIM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: SPACING.SM,
    marginRight: SPACING.SM,
  },
  
  filterToggleText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
    marginLeft: SPACING.SM,
  },
  
  filterBadge: {
    backgroundColor: COLORS.ACCENT_ERROR_BADGE,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.SM,
  },
  
  filterBadgeText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.XS,
    fontWeight: TYPOGRAPHY.BOLD,
  },
  
  // Sidebar toggle styles
  sidebarToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    borderRadius: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER_TERTIARY,
    marginHorizontal: SPACING.LG,
    marginTop: SPACING.SM,
  },
  
  sidebarToggleText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.MD,
    fontWeight: TYPOGRAPHY.SEMIBOLD,
    marginLeft: SPACING.SM,
  },
  
  // Chip styles
  rowChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    marginTop: SPACING.SM,
  },
  
  chipItem: {
    marginRight: SPACING.SM,
    marginBottom: SPACING.SM,
  },
});

export default styles;
