import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/config/supabaseClient";
import type { User } from "@supabase/supabase-js";
import EventList from "@/events/screens/EventList";

export default function SupabaseAuthScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    };
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen
  if (loading) {
    return (
      <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer} testID="loading-container">
            {/* You can add a loading spinner here */}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // If user is authenticated, show EventList
  if (user) {
    return <EventList />;
  }

  // Show Supabase Auth UI
  return (
    <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer} testID="auth-container">
          <AuthForm />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Custom Auth Form using Supabase methods
function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) {
          Alert.alert("Sign Up Error", error.message);
        } else {
          Alert.alert("Success", "Please check your email to verify your account");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
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

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'your-app-scheme://auth/callback', // You'll need to configure this
        }
      });
      
      if (error) {
        Alert.alert("Google Auth Error", error.message);
      }
    } catch (error) {
      Alert.alert("Error", "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email first");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app-scheme://auth/reset-password', // You'll need to configure this
      });
      
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Password reset email sent!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send reset email");
    }
  };

  return (
    <View style={styles.formContainer} testID="auth-form-container">
      {/* You can replace this with a more styled form or use a library like react-native-elements */}
      <View style={styles.form}>
        <Text style={styles.title} testID="welcome-title">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </Text>
        
        <Text style={styles.subtitle} testID="welcome-subtitle">
          {isSignUp ? "Sign up to create and manage your events" : "Sign in to manage your events"}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="email-input"
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            testID="password-input"
          />
          <Pressable 
            onPress={() => setShowPassword(!showPassword)} 
            style={styles.eyeIcon}
            testID="password-toggle"
          >
            <Text style={styles.eyeIconText}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
          </Pressable>
        </View>
        
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
          testID="sign-in-button"
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </Text>
        </Pressable>
        
        <Pressable
          style={styles.button}
          onPress={handleGoogleAuth}
          disabled={loading}
          testID="google-auth-button"
        >
          <Text style={styles.buttonText}>Continue with Google</Text>
        </Pressable>
        
        <Pressable onPress={() => setIsSignUp(!isSignUp)} testID="toggle-auth-mode">
          <Text style={styles.linkText} testID="toggle-auth-text">
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>
        
        <Pressable onPress={handleForgotPassword} testID="forgot-password-button">
          <Text style={styles.linkText}>Forgot Password?</Text>
        </Pressable>
      </View>
    </View>
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
  authContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
  },
  form: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 15,
    color: "white",
    fontSize: 16,
    flex: 1,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingRight: 15,
  },
  eyeIcon: {
    padding: 10,
  },
  eyeIconText: {
    fontSize: 18,
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 10,
  },
});
