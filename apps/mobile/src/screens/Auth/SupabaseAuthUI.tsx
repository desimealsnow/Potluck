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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../config/supabaseClient";
import type { User, AuthError } from "@supabase/supabase-js";
import EventList from "./EventList";

export default function SupabaseAuthUI() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
        } else if (session?.user) {
          setUser(session.user);
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
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen
  if (loading) {
    return (
      <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer} testID="loading-container">
            <Text style={styles.loadingText} testID="loading-text">Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // If user is authenticated, show EventList
  if (user) {
    return <EventList />;
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
            <Ionicons name="mail" size={20} color="rgba(255,255,255,0.7)" style={authStyles.inputIcon} />
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
            <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" style={authStyles.inputIcon} />
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
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
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
              <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" style={authStyles.inputIcon} />
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
        >
          <LinearGradient
            colors={canSubmit ? ["#7C5CFF", "#2FB4FF"] : ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
            style={authStyles.authButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={authStyles.authButtonText}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Toggle Sign Up/Sign In */}
        <Pressable onPress={() => setIsSignUp(!isSignUp)} style={authStyles.toggleButton}>
          <Text style={authStyles.toggleText}>
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>

        {/* Forgot Password */}
        {!isSignUp && (
          <Pressable onPress={handleForgotPassword} style={authStyles.forgotButton}>
            <Text style={authStyles.forgotText}>Forgot Password?</Text>
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
