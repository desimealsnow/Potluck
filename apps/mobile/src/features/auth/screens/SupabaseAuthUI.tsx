import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@ui";
import { supabase } from "@/config/supabaseClient";
import { apiClient } from "@/services/apiClient";
import type { User, AuthError } from "@supabase/supabase-js";
import EventList from "@/events/screens/EventList";
import ProfileSetupScreen from "@/profile/screens/ProfileSetupScreen";
import SubscriptionScreen from "@/payments/screens/SubscriptionScreen";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import * as Linking from 'expo-linking';
import EventDetailsPage from '@/events/screens/EventDetailsPage';

export default function SupabaseAuthUI() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; radius_km: number } | null>(null);
  const [deepEventId, setDeepEventId] = useState<string | null>(null);
  
  const { hasActiveSubscription, isLoading: subscriptionLoading } = useSubscriptionCheck();

  // Temporary debug log
  useEffect(() => {
    console.log('[SupabaseAuthUI] Mounted. State:', {
      user: !!user,
      loading,
      showProfileSetup,
      showSubscription,
      isNewUser,
      hasActiveSubscription,
      subscriptionLoading,
      deepEventId,
    });
  }, [user, loading, showProfileSetup, showSubscription, isNewUser, hasActiveSubscription, subscriptionLoading, deepEventId]);

  // Function to load user location
  const loadUserLocation = async () => {
    try {
      const response = await apiClient.get('/user-profile/me') as any;
      console.log('🔎 /me payload:', {
        hasLat: !!response.latitude,
        hasLon: !!response.longitude,
        city: response.city,
        radius: response.discoverability_radius_km,
        home_geog: response.home_geog ? 'present' : 'absent'
      });
      // Prefer server-provided coordinates
      if (response.latitude && response.longitude) {
        const radius = response.discoverability_radius_km || 10;
        setUserLocation({
          lat: response.latitude,
          lon: response.longitude,
          radius_km: radius
        });
        console.log("User location loaded:", { lat: response.latitude, lon: response.longitude, radius });
        return;
      }

      // Fallback: if we have a city string but no coordinates, geocode the city
      if (response.city && typeof response.city === 'string') {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(response.city)}&limit=1`;
          console.log('🌍 Geocoding city via Nominatim:', url);
          const geoRes = await fetch(url, { headers: { 'Accept': 'application/json' } });
          const list = await geoRes.json();
          console.log('🌍 Geocoding result length:', Array.isArray(list) ? list.length : 'not-array');
          if (Array.isArray(list) && list.length > 0) {
            const first = list[0];
            const lat = parseFloat(first.lat);
            const lon = parseFloat(first.lon);
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              const radius = response.discoverability_radius_km || 10;
              setUserLocation({ lat, lon, radius_km: radius });
              console.log("User location derived from city:", { lat, lon, radius });
              return;
            }
          }
          // Fallback: progressively shorten the query (strip postal codes and deep locality parts)
          const components = String(response.city).split(',').map(s => s.trim()).filter(Boolean);
          const cleaned = components.filter(c => !/^\d{4,}$/.test(c));
          // Try from broader to narrower: last 3 -> last 2 -> middle city-like tokens
          const candidates: string[] = [];
          if (cleaned.length >= 3) candidates.push(cleaned.slice(-3).join(', '));
          if (cleaned.length >= 2) candidates.push(cleaned.slice(-2).join(', '));
          if (cleaned.length >= 1) candidates.push(cleaned[cleaned.length - 1]);
          if (cleaned.length >= 1) candidates.push(cleaned[0]);
          for (const q of candidates) {
            const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
            console.log('🌍 Geocoding fallback:', q, url2);
            const r2 = await fetch(url2, { headers: { 'Accept': 'application/json' } });
            const l2 = await r2.json();
            if (Array.isArray(l2) && l2.length > 0) {
              const lat2 = parseFloat(l2[0].lat);
              const lon2 = parseFloat(l2[0].lon);
              if (!Number.isNaN(lat2) && !Number.isNaN(lon2)) {
                const radius = response.discoverability_radius_km || 10;
                setUserLocation({ lat: lat2, lon: lon2, radius_km: radius });
                console.log('User location derived from fallback:', { q, lat: lat2, lon: lon2, radius });
                return;
              }
            }
          }
        } catch (e) {
          console.log('City geocoding failed:', e);
        }
      }
    } catch (error) {
      console.log("Could not load user location:", error);
    }
  };

  // Debug function for testing - can be called from browser console
  const resetSetupForTesting = async () => {
    try {
      // Reset setup_completed flag in database
      if (user?.id) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ setup_completed: false })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Failed to reset setup flag:', error);
        } else {
          console.log('Setup flag reset successfully');
        }
      }
      
      // Show setup screen
      setShowProfileSetup(true);
      setShowSubscription(false);
      setIsNewUser(true);
    } catch (error) {
      console.error('Error resetting setup:', error);
    }
  };

  // Make debug function available globally for testing
  if (typeof window !== 'undefined') {
    (window as any).resetSetupForTesting = resetSetupForTesting;
  }

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
        } else if (session?.user) {
          setUser(session.user);
          if ((session as any).access_token) {
            try { (apiClient as any).setAuthToken?.((session as any).access_token); } catch {}
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        if (session?.user) {
          setUser(session.user);
          if ((session as any).access_token) {
            try { (apiClient as any).setAuthToken?.((session as any).access_token); } catch {}
          }
          
          // Check if user needs profile setup
          const needsProfileSetup = !session.user.user_metadata?.display_name;
          
          // Check if user has completed setup using our REST API
          let setupCompleted = false;
          try {
            console.log("Checking setup completion via REST API...");
            
            // Add a small delay to ensure auth token is ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Only make the API call if we have a valid session
            if (session?.access_token) {
              console.log('🔐 Access token present, calling /me');
              const response = await apiClient.get('/user-profile/me') as any;
              console.log("Profile check response:", response);
            
              if (response.setup_completed) {
                setupCompleted = true;
                console.log("Setup completed based on API response");
              } else {
                console.log("Setup not completed based on API response");
              }
              
              // Also extract user location for EventList
              if (response.latitude && response.longitude) {
                const radius = response.discoverability_radius_km || 10;
                setUserLocation({
                  lat: response.latitude,
                  lon: response.longitude,
                  radius_km: radius
                });
                console.log("User location loaded for EventList:", { lat: response.latitude, lon: response.longitude, radius });
              }
            } else {
              console.log("No access token available, skipping API call");
            }
          } catch (apiError) {
            // If API call fails, fall back to user metadata check
            console.log("Could not check setup completion via API:", apiError);
            console.log("Falling back to user metadata check");
            
            // Check if user has display_name in metadata (indicates setup completed)
            if (session.user.user_metadata?.display_name) {
              setupCompleted = true;
              console.log("Setup completed based on user metadata fallback");
            } else {
              console.log("Setup not completed - no display_name in metadata");
            }
          }

          // Show setup if user hasn't completed it
          if (needsProfileSetup || !setupCompleted) {
            console.log("Showing profile setup - needsSetup:", needsProfileSetup, "setupCompleted:", setupCompleted);
            setIsNewUser(true);
            setShowProfileSetup(true);
          } else {
            console.log("Profile setup completed, showing main app");
          }

          // For testing: Check if user wants to reset setup
          // You can add a query parameter or localStorage flag to trigger this
          const shouldResetSetup = false; // Set to true for testing
          if (shouldResetSetup) {
            setIsNewUser(true);
            setShowProfileSetup(true);
          }
        } else {
          setUser(null);
          setShowProfileSetup(false);
          setShowSubscription(false);
          setIsNewUser(false);
          try { (apiClient as any).setAuthToken?.(undefined); } catch {}
        }
      }
    );

    const sub = Linking.addEventListener('url', ({ url }) => {
      try {
        const parsed = Linking.parse(url);
        const path = parsed?.path || '';
        if (path.startsWith('event/')) {
          const eid = path.split('/')[1];
          if (eid) setDeepEventId(eid);
        }
      } catch {}
    });

    return () => {
      subscription.unsubscribe();
      try { sub.remove(); } catch {}
    };
  }, []);

  // Ensure we attempt to load location when main app becomes visible
  useEffect(() => {
    const inApp = !!user && !showProfileSetup && !showSubscription && !loading;
    if (inApp && !userLocation) {
      console.log('🔁 Loading user location on app view mount');
      loadUserLocation();
    }
  }, [user, showProfileSetup, showSubscription, loading]);

  // Show loading screen
  if (loading) {
    return (
      <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer} testID="loading-container">
            <Text style={styles.loadingText} testID="loading-text">Loading...</Text>
            <Text style={[styles.loadingText, { fontSize: 14, marginTop: 10 }]}>
              DEBUG: SupabaseAuthUI loading state
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show profile setup for new users or users without profile
  if (user && showProfileSetup) {
    return (
      <ProfileSetupScreen
        onComplete={() => {
          setShowProfileSetup(false);
          // Load user location after profile setup
          loadUserLocation();
          // After profile setup, check subscription
          if (!hasActiveSubscription) {
            setShowSubscription(true);
          }
        }}
        onSkip={() => {
          setShowProfileSetup(false);
          // Load user location after profile setup
          loadUserLocation();
          // After skipping profile setup, check subscription
          if (!hasActiveSubscription) {
            setShowSubscription(true);
          }
        }}
      />
    );
  }

  // Show subscription screen if user doesn't have active subscription
  // Only show if user is authenticated and subscription check is complete
  if (user && showSubscription && !hasActiveSubscription && !subscriptionLoading) {
    return (
      <SubscriptionScreen
        onBack={() => {
          setShowSubscription(false);
          // Allow user to continue without subscription for now
        }}
      />
    );
  }

  // If user is authenticated and has completed setup, show EventList
  if (user && !showProfileSetup && !showSubscription && !loading) {
    return <EventList userLocation={userLocation} />;
  }

  // If app is authenticated and deep link is present, open event details
  if (user && !showProfileSetup && !showSubscription && deepEventId) {
    return (
      <EventDetailsPage 
        eventId={deepEventId} 
        onBack={() => setDeepEventId(null)} 
        onActionCompleted={() => setDeepEventId(null)} 
      />
    );
  }

  // Show loading while checking profile setup
  if (user && loading) {
    return (
      <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show Auth UI
  return (
    <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.authContainer} testID="auth-container">
            <Text style={styles.title} testID="welcome-title">Welcome to Potluck</Text>
            <Text style={styles.subtitle} testID="welcome-subtitle">Sign in to manage your events</Text>
            
            <AuthFormComponent />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  authContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 40,
  },
});

// Inline Auth Form Component
function AuthFormComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = !isSignUp || password === confirmPassword;
  const canSubmit = isEmailValid && isPasswordValid && isConfirmPasswordValid;

  const handleAuth = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: email.split('@')[0],
            }
          }
        });
        
        if (error) {
          Alert.alert("Sign Up Error", error.message);
        } else if (data.user && !data.user.email_confirmed_at) {
          Alert.alert(
            "Check Your Email", 
            "We've sent you a confirmation link. Please check your email and click the link to verify your account."
          );
        } else {
          Alert.alert("Success", "Account created successfully!");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) {
          Alert.alert("Login Error", error.message);
        }
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email first");
      return;
    }

    if (!isEmailValid) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'potluck://auth/reset-password',
      });
      
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Password reset email sent! Check your inbox.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send reset email");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={authStyles.container}
      testID="auth-form-container"
    >
      <View style={authStyles.formCard} testID="auth-form-card">
        {/* Email Input */}
        <View style={authStyles.inputContainer}>
          <View style={authStyles.inputWrapper}>
            <Icon name="Mail" size={20} color="rgba(255,255,255,0.7)" style={authStyles.inputIcon} />
            <TextInput
              style={authStyles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />
          </View>
          {email.length > 0 && !isEmailValid && (
            <Text style={authStyles.errorText} testID="email-error">Please enter a valid email</Text>
          )}
        </View>

        {/* Password Input */}
        <View style={authStyles.inputContainer}>
          <View style={authStyles.inputWrapper}>
            <Icon name="Lock" size={20} color="rgba(255,255,255,0.7)" style={authStyles.inputIcon} />
            <TextInput
              style={authStyles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              testID="password-input"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={authStyles.eyeIcon} testID="password-toggle">
              <Icon 
                name={showPassword ? "EyeOff" : "Eye"} 
                size={20} 
                color="rgba(255,255,255,0.7)" 
              />
            </Pressable>
          </View>
          {password.length > 0 && !isPasswordValid && (
            <Text style={authStyles.errorText} testID="password-error">Password must be at least 6 characters</Text>
          )}
        </View>

        {/* Confirm Password (Sign Up only) */}
        {isSignUp && (
          <View style={authStyles.inputContainer}>
            <View style={authStyles.inputWrapper}>
              <Icon name="Lock" size={20} color="rgba(255,255,255,0.7)" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="Confirm Password"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="confirm-password-input"
              />
            </View>
            {confirmPassword.length > 0 && !isConfirmPasswordValid && (
              <Text style={authStyles.errorText} testID="confirm-password-error">Passwords do not match</Text>
            )}
          </View>
        )}

        {/* Auth Button */}
        <Pressable
          style={[authStyles.authButton, !canSubmit && authStyles.authButtonDisabled]}
          onPress={handleAuth}
          disabled={!canSubmit || loading}
          testID={isSignUp ? "sign-up-button" : "sign-in-button"}
        >
          <LinearGradient
            colors={canSubmit ? ["#7C5CFF", "#2FB4FF"] : ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
            style={authStyles.authButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" testID="auth-loading" />
            ) : (
              <Text style={authStyles.authButtonText} testID={isSignUp ? "sign-up-text" : "sign-in-text"}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Toggle Sign Up/Sign In */}
        <Pressable onPress={() => setIsSignUp(!isSignUp)} style={authStyles.toggleButton} testID="toggle-auth-mode">
          <Text style={authStyles.toggleText} testID="toggle-auth-text">
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>

        {/* Forgot Password */}
        {!isSignUp && (
          <Pressable onPress={handleForgotPassword} style={authStyles.forgotButton} testID="forgot-password-button">
            <Text style={authStyles.forgotText} testID="forgot-password-text">Forgot Password?</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  container: {
    width: "100%",
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    color: "white",
    fontSize: 16,
  },
  eyeIcon: {
    padding: 16,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  authButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  authButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleButton: {
    marginBottom: 12,
  },
  toggleText: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    fontSize: 14,
  },
  forgotButton: {
    marginBottom: 8,
  },
  forgotText: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
