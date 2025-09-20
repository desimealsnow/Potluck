import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';

interface HeaderProps {
  onNotifications?: () => void;
  onSettings?: () => void;
  onPlans?: () => void;
  onLogout?: () => void;
  unreadCount?: number;
  showNavigation?: boolean;
}

export default function Header({
  onNotifications,
  onSettings,
  onPlans,
  onLogout,
  unreadCount = 0,
  showNavigation = false,
}: HeaderProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);


  return (
        <View style={styles.container}>
      <View style={[styles.content, !isTablet && styles.mobileContent]}>
        {/* Left Section - Logo & Navigation */}
        <View style={[styles.leftSection, !isTablet && styles.mobileLeftSection]}>
          <View style={[styles.logoSection, !isTablet && styles.mobileLogoSection]}>
            <View style={[styles.logoContainer, !isTablet && styles.mobileLogoContainer]}>
              <Icon name="Calendar" size={!isTablet ? 20 : 24} color="#1F2937" />
            </View>
            {isTablet && (
              <View style={styles.logoText}>
                <Text style={styles.logoTitle}>Potluck</Text>
                <Text style={styles.logoSubtitle}>Professional Event Platform</Text>
              </View>
            )}
            {!isTablet && (
              <Text style={styles.mobileLogoTitle}>Potluck</Text>
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


        {/* Right Section - Actions & Profile */}
        <View style={[styles.rightSection, !isTablet && styles.mobileRightSection]}>
          {/* Quick Actions - Only on tablet */}
          {isTablet && (
            <View style={styles.quickActions}>
              <Pressable style={styles.actionButton}>
                <Icon name="Share2" size={16} color="#6B7280" />
              </Pressable>
            </View>
          )}

          {/* Notifications - Only show on tablet */}
          {onNotifications && isTablet && (
            <Pressable onPress={onNotifications} style={styles.notificationButton}>
              <Icon name="Bell" size={18} color="#6B7280" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Settings - Only show on tablet */}
          {onSettings && isTablet && (
            <Pressable onPress={onSettings} style={styles.actionButton}>
              <Icon name="Settings" size={18} color="#6B7280" />
            </Pressable>
          )}

          {/* Plans - Only show on tablet */}
          {onPlans && isTablet && (
            <Pressable onPress={onPlans} style={styles.actionButton}>
              <Icon name="CreditCard" size={18} color="#6B7280" />
            </Pressable>
          )}


          {/* Mobile Menu */}
          {!isTablet && (
            <Pressable 
              style={styles.mobileMenuButton}
              onPress={() => {
                console.log('Hamburger menu clicked, current state:', mobileMenuVisible);
                setMobileMenuVisible(!mobileMenuVisible);
              }}
            >
              <Icon name="Menu" size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>
      
      {/* Mobile Menu Modal */}
      <Modal
        visible={!isTablet && mobileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMobileMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMobileMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.mobileMenuModal}>
                {/* Drag Handle */}
                <View style={styles.dragHandle} />
                
                
                {/* Menu Items */}
                <View style={styles.mobileMenuItems}>
                  {onNotifications && (
                    <TouchableOpacity 
                      onPress={() => {
                        console.log('Notifications menu item clicked');
                        onNotifications();
                        setMobileMenuVisible(false);
                      }} 
                      style={styles.mobileMenuItem}
                      activeOpacity={0.7}
                    >
                      <Icon name="Bell" size={20} color="#6B7280" />
                      <Text style={styles.mobileMenuItemText}>Notifications</Text>
                      {unreadCount > 0 && (
                        <View style={styles.mobileNotificationBadge}>
                          <Text style={styles.mobileNotificationBadgeText}>
                            {unreadCount > 9 ? '9+' : String(unreadCount)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {onSettings && (
                    <TouchableOpacity 
                      onPress={() => {
                        console.log('Settings menu item clicked');
                        onSettings();
                        setMobileMenuVisible(false);
                      }} 
                      style={styles.mobileMenuItem}
                      activeOpacity={0.7}
                    >
                      <Icon name="Settings" size={20} color="#6B7280" />
                      <Text style={styles.mobileMenuItemText}>Settings</Text>
                    </TouchableOpacity>
                  )}
                  
                  {onPlans && (
                    <TouchableOpacity 
                      onPress={() => {
                        console.log('Plans menu item clicked');
                        onPlans();
                        setMobileMenuVisible(false);
                      }} 
                      style={styles.mobileMenuItem}
                      activeOpacity={0.7}
                    >
                      <Icon name="CreditCard" size={20} color="#6B7280" />
                      <Text style={styles.mobileMenuItemText}>Plans</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    onPress={() => {
                      console.log('Logout menu item clicked');
                      onLogout?.();
                      setMobileMenuVisible(false);
                    }} 
                    style={styles.mobileMenuItem}
                    activeOpacity={0.7}
                  >
                    <Icon name="LogOut" size={20} color="#6B7280" />
                    <Text style={styles.mobileMenuItemText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FBFBFB',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  logoSubtitle: {
    color: '#6B7280',
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
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  navTextActive: {
    color: '#1F2937',
    fontWeight: '600',
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
    color: '#1F2937',
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
    color: '#1F2937',
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
  // Mobile Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileMenuModal: {
    backgroundColor: '#FBFBFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area for iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  mobileMenuItems: {
    paddingVertical: 8,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56, // Better touch target
  },
  mobileMenuItemText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  mobileNotificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  mobileNotificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
