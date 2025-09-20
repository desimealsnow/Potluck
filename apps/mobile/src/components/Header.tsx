import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCreateEvent?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  onPlans?: () => void;
  onLogout?: () => void;
  searchQuery?: string;
  unreadCount?: number;
  showSearch?: boolean;
  showNavigation?: boolean;
}

export default function Header({
  onSearch,
  onCreateEvent,
  onNotifications,
  onSettings,
  onPlans,
  onLogout,
  searchQuery = '',
  unreadCount = 0,
  showSearch = true,
  showNavigation = false,
}: HeaderProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const handleSearchChange = (text: string) => {
    onSearch?.(text);
  };

  return (
    <LinearGradient
      colors={['#1e1b4b', '#312e81', '#1e1b4b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={[styles.content, !isTablet && styles.mobileContent]}>
        {/* Left Section - Logo & Navigation */}
        <View style={[styles.leftSection, !isTablet && styles.mobileLeftSection]}>
          <View style={[styles.logoSection, !isTablet && styles.mobileLogoSection]}>
            <View style={[styles.logoContainer, !isTablet && styles.mobileLogoContainer]}>
              <Icon name="Calendar" size={!isTablet ? 20 : 24} color="#fff" />
            </View>
            {isTablet && (
              <View style={styles.logoText}>
                <Text style={styles.logoTitle}>EventHub</Text>
                <Text style={styles.logoSubtitle}>Professional Event Platform</Text>
              </View>
            )}
            {!isTablet && (
              <Text style={styles.mobileLogoTitle}>EventHub</Text>
            )}
          </View>
          
          {/* Navigation - Only shown when enabled */}
          {showNavigation && isTablet && (
            <View style={styles.navigation}>
              <Pressable style={styles.navButton}>
                <Icon name="House" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.navText}>Dashboard</Text>
              </Pressable>
              <Pressable style={[styles.navButton, styles.navButtonActive]}>
                <Icon name="Calendar" size={16} color="#fff" />
                <Text style={[styles.navText, styles.navTextActive]}>Events</Text>
              </Pressable>
              <Pressable style={styles.navButton}>
                <Icon name="Users" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.navText}>Attendees</Text>
              </Pressable>
              <Pressable style={styles.navButton}>
                <Icon name="TrendingUp" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.navText}>Analytics</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Center Section - Search (Only on tablet) */}
        {showSearch && isTablet && (
          <View style={styles.centerSection}>
            <View style={styles.searchContainer}>
              <Icon name="Search" size={16} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
              <TextInput
                placeholder="Search events, attendees, or organizers..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={handleSearchChange}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
          </View>
        )}

        {/* Right Section - Actions & Profile */}
        <View style={[styles.rightSection, !isTablet && styles.mobileRightSection]}>
          {/* Quick Actions - Only on tablet */}
          {isTablet && (
            <View style={styles.quickActions}>
              {onCreateEvent && (
                <Pressable onPress={onCreateEvent} style={styles.createButton}>
                  <Icon name="Plus" size={16} color="#fff" />
                  <Text style={styles.createButtonText}>Create Event</Text>
                </Pressable>
              )}
              
              <Pressable style={styles.actionButton}>
                <Icon name="Share2" size={16} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>
          )}

          {/* Notifications */}
          {onNotifications && (
            <Pressable onPress={onNotifications} style={[styles.notificationButton, !isTablet && styles.mobileActionButton]}>
              <Icon name="Bell" size={!isTablet ? 16 : 18} color="rgba(255,255,255,0.8)" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Settings */}
          {onSettings && (
            <Pressable onPress={onSettings} style={[styles.actionButton, !isTablet && styles.mobileActionButton]}>
              <Icon name="Settings" size={!isTablet ? 16 : 18} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}

          {/* Plans */}
          {onPlans && (
            <Pressable onPress={onPlans} style={[styles.actionButton, !isTablet && styles.mobileActionButton]}>
              <Icon name="CreditCard" size={!isTablet ? 16 : 18} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}

          {/* Profile */}
          <Pressable style={[styles.profileButton, !isTablet && styles.mobileActionButton]}>
            <View style={[styles.avatarContainer, !isTablet && styles.mobileAvatarContainer]}>
              <Icon name="User" size={!isTablet ? 14 : 16} color="#fff" />
            </View>
          </Pressable>

          {/* Mobile Menu */}
          {!isTablet && (
            <Pressable style={styles.mobileMenuButton}>
              <Icon name="Menu" size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    flexDirection: 'column',
  },
  logoTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  logoSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  navButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  navText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  navTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  centerSection: {
    flex: 1,
    maxWidth: 400,
    marginHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 6,
  },
  notificationButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 6,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Mobile-specific styles
  mobileContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 50,
  },
  mobileLeftSection: {
    flex: 1,
  },
  mobileLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileLogoContainer: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  mobileLogoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  mobileRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileActionButton: {
    width: 32,
    height: 32,
    marginRight: 4,
  },
  mobileAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
