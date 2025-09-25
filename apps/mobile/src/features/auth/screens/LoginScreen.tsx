import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/ui";
import { supabase } from "@/config/supabaseClient";
import type { User } from "@supabase/supabase-js";
import EventList from "@/events/screens/EventList";
import SignupScreen from "@/auth/screens/SignupScreen";

// Type definitions
import type { IconName } from "@/ui/Icon";
type KeyboardType = "default" | "email-address" | "numeric" | "phone-pad";
type AutoCapitalize = "none" | "sentences" | "words" | "characters";

export default function App() {
  const [theme, setTheme] = useState("dark"); // 'light' | 'dark'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [showEventList, setShowEventList] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const bg = useMemo(() => {
    return theme === "dark"
      ? ["#5A60F6", "#3C8CE7", "#00B8D4"] as const // violet → blue → cyan
      : ["#A7B6FF", "#86C5FF", "#8DEBFF"] as const;
  }, [theme]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = isEmailValid && password.length >= 6;
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setShowEventList(true);
      }
    };
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setShowEventList(true);
      } else {
        setUser(null);
        setShowEventList(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show EventList if requested
  if (showEventList) {
    return <EventList />;
  }

  // Show SignupScreen if requested
  if (showSignup) {
    return (
      <SignupScreen 
        onNavigateBack={() => setShowSignup(false)}
        onSignupSuccess={() => {
          setShowSignup(false);
          setShowEventList(true);
        }}
      />
    );
  }

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Login successful!");
        setUser(data.user);
        setShowEventList(true);
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setShowEventList(false);
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  return (
    <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Theme toggle */}
        <View style={styles.header}>
          <Pressable onPress={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} style={styles.modeBtn}>
            <Icon name={theme === "dark" ? "Moon" : "Sun"} size={18} color="#fff" />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding" })}>
          <View style={styles.centerWrap}>
            {/* Frosted card */}
            <BlurView intensity={60} tint={theme === "dark" ? "dark" : "light"} style={styles.card}>
              <View style={styles.cardInner}>
                <Text style={styles.title}>Welcome back 👋</Text>
                <Text style={styles.subtitle}>Sign in to continue your journey</Text>

                {/* Social row (placeholders) */}
                <View style={styles.socialRow}>
                  {(["Chrome", "Apple", "Github", "MessageSquare", "Globe"] as IconName[]).map((icon) => (
                    <Pressable key={icon} style={styles.socialBtn}>
                      <Icon name={icon} size={18} color="#EAF2FF" />
                    </Pressable>
                  ))}
                </View>

                {/* Email */}
                <Field
                  icon="Mail"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  secureTextEntry={false}
                  rightIcon={undefined}
                  onPressRight={undefined}
                  testID="emailInput"
                />
                {email.length > 0 && !isEmailValid && (
                  <Text style={styles.errorText}>Please enter a valid email address</Text>
                )}
                
                {/* Debug info - remove in production */}
                <Text style={styles.debugText}>
                  Debug: Email valid: {isEmailValid ? 'Yes' : 'No'} | Password length: {password.length} | Can submit: {canSubmit ? 'Yes' : 'No'}
                </Text>

                {/* Password */}
                <Field
                  icon="Lock"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secure}
                  rightIcon={secure ? "Eye" : "EyeOff"}
                  onPressRight={() => setSecure((s) => !s)}
                  keyboardType="default"
                  autoCapitalize="none"
                  testID="passwordInput"
                />

                {/* Primary login button */}
                <Pressable
                  disabled={!canSubmit || loading}
                  onPress={handleLogin}
                  accessibilityRole="button"
                  testID="loginButton"
                  style={({ pressed }) => [{ opacity: !canSubmit || loading ? 0.6 : pressed ? 0.9 : 1 }]}
                >
                  {/* Wrap inner content with a View that exposes testID on RN Web */}
                  <View testID="loginButton">
                    <LinearGradient
                      colors={theme === "dark" ? ["#7C5CFF", "#2FB4FF"] : ["#7F8CFF", "#39C6FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>
                        {loading ? "Signing in..." : "Log in"}
                      </Text>
                    </LinearGradient>
                  </View>
                </Pressable>

                {/* Secondary outline button - Navigate to EventList */}
                <Pressable 
                  onPress={() => setShowEventList(true)} 
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.secondaryBtnText}>View Events (Demo)</Text>
                </Pressable>

                {/* Links */}
                <Pressable onPress={() => {}} style={{ marginTop: 18 }}>
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>

                <View style={styles.bottomRow}>
                  <Text style={styles.muted}>Don&apos;t have an account? </Text>
                  <Pressable onPress={() => setShowSignup(true)}>
                    <Text style={styles.link}>Create an account</Text>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------- Reusable Field ---------- */
interface FieldProps {
  icon: IconName;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  rightIcon?: IconName;
  onPressRight?: () => void;
  keyboardType?: KeyboardType;
  autoCapitalize?: AutoCapitalize;
  testID?: string;
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  rightIcon,
  onPressRight,
  keyboardType,
  autoCapitalize,
  testID,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldIcon}>
        <Icon name={icon} size={18} color="#EAF2FF" />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.85)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        testID={testID}
      />
      {rightIcon ? (
        <Pressable onPress={onPressRight} style={styles.fieldIconRight}>
          <Icon name={rightIcon} size={18} color="#EAF2FF" />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, alignItems: "flex-end" },
  modeBtn: {
    marginTop: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  card: {
    width: "94%",
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 12 },
    }),
  },
  cardInner: {
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { marginTop: 6, color: "rgba(255,255,255,0.9)", fontSize: 14 },
  socialRow: { flexDirection: "row", marginTop: 18, marginBottom: 6 },
  socialBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  fieldWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    height: 50,
    paddingRight: 8,
  },
  fieldIcon: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  fieldIconRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingHorizontal: 6,
    fontSize: 15,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "600" },
  link: { color: "#EAF2FF", textDecorationLine: "underline", fontWeight: "600" },
  muted: { color: "rgba(255,255,255,0.85)" },
  bottomRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  errorText: { 
    color: "#ff6b6b", 
    fontSize: 12, 
    marginTop: 4, 
    marginLeft: 4 
  },
  debugText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    marginTop: 4,
    marginLeft: 4,
  },
});
