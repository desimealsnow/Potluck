import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../config/supabaseClient";

export function AuthForm() {
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
              display_name: email.split('@')[0], // Use email prefix as display name
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
        // Success is handled by auth state change
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
          redirectTo: 'potluck://auth/callback', // Configure this in your app
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

    if (!isEmailValid) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'potluck://auth/reset-password', // Configure this in your app
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
      style={styles.container}
    >
      <View style={styles.formCard}>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {email.length > 0 && !isEmailValid && (
            <Text style={styles.errorText}>Please enter a valid email</Text>
          )}
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="rgba(255,255,255,0.7)" 
              />
            </Pressable>
          </View>
          {password.length > 0 && !isPasswordValid && (
            <Text style={styles.errorText}>Password must be at least 6 characters</Text>
          )}
        </View>

        {/* Confirm Password (Sign Up only) */}
        {isSignUp && (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
            {confirmPassword.length > 0 && !isConfirmPasswordValid && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>
        )}

        {/* Auth Button */}
        <Pressable
          style={[styles.authButton, !canSubmit && styles.authButtonDisabled]}
          onPress={handleAuth}
          disabled={!canSubmit || loading}
        >
          <LinearGradient
            colors={canSubmit ? ["#7C5CFF", "#2FB4FF"] : ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
            style={styles.authButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.authButtonText}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Google Auth Button */}
        <Pressable
          style={styles.googleButton}
          onPress={handleGoogleAuth}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color="white" style={styles.googleIcon} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        {/* Toggle Sign Up/Sign In */}
        <Pressable onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>

        {/* Forgot Password */}
        {!isSignUp && (
          <Pressable onPress={handleForgotPassword} style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  googleIcon: {
    marginRight: 8,
  },
  googleButtonText: {
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
