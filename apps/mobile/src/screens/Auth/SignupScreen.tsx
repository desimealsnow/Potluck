import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../config/supabaseClient";


/** ---- Helpers ---- */
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const strongEnough = (p: string) => p.length >= 8;

interface SignupScreenProps {
  onNavigateBack?: () => void;
  onSignupSuccess?: () => void;
}

export default function SignupScreen({ onNavigateBack, onSignupSuccess }: SignupScreenProps = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = name.trim().length >= 2 && isEmail(email) && strongEnough(password) && agree;

  const bg = useMemo(() => ["#6A6FF0", "#8A6FE8", "#39C3FF"] as const, []);

  const onSubmit = async () => {
    if (!valid) return;
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: name.trim(),
          }
        }
      });

      if (error) {
        Alert.alert("Sign up failed", error.message);
      } else {
        if (data.user && !data.user.email_confirmed_at) {
          Alert.alert("Success", "Account created! Please check your email to verify your account.");
        } else {
          Alert.alert("Success", "Account created successfully!");
          onSignupSuccess?.();
        }
      }
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding" })}>
          <View style={styles.center}>
            <BlurView intensity={60} tint="dark" style={styles.card}>
              <View style={styles.inner}>
                <Text style={styles.emoji}>🎉 ✨ 🚀</Text>
                <Text style={styles.title}>Create account ✨</Text>
                <Text style={styles.subtitle}>Join thousands of users today</Text>

                <Field
                  icon="person"
                  placeholder="Enter your display name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
                <Field
                  icon="mail"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Field
                  icon="lock-closed"
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secure}
                  rightIcon={secure ? "eye" : "eye-off"}
                  onPressRight={() => setSecure((s) => !s)}
                />

                {/* Terms row */}
                <Pressable onPress={() => setAgree((a) => !a)} style={styles.termsRow}>
                  <View style={[styles.checkbox, agree && styles.checkboxOn]}>
                    {agree ? <Ionicons name="checkmark" size={14} color="#0b3d2a" /> : null}
                  </View>
                  <Text style={styles.termsText}>I agree to the </Text>
                  <Pressable onPress={() => Linking.openURL("https://example.com/terms")}>
                    <Text style={styles.link}>Terms & Conditions</Text>
                  </Pressable>
                  <Text style={styles.termsText}> and </Text>
                  <Pressable onPress={() => Linking.openURL("https://example.com/privacy")}>
                    <Text style={styles.link}>Privacy Policy</Text>
                  </Pressable>
                </Pressable>

                {/* CTA */}
                <Pressable disabled={!valid || loading} onPress={onSubmit} style={{ marginTop: 16 }}>
                  <LinearGradient
                    colors={valid ? ["#7C5CFF", "#2FB4FF"] : ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.25)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.cta, !valid && { opacity: 0.7 }]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ctaText}>Sign up</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable style={{ marginTop: 22 }} onPress={onNavigateBack}>
                  <Text style={styles.haveAccount}>I have an account</Text>
                </Pressable>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/** -------- Reusable input field -------- */
function Field({
  icon,
  rightIcon,
  onPressRight,
  ...props
}: any) {
  return (
    <View style={styles.field}>
      <View style={styles.leftIcon}>
        <Ionicons name={icon} size={18} color="#EAF2FF" />
      </View>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="rgba(255,255,255,0.85)"
      />
      {rightIcon ? (
        <Pressable onPress={onPressRight} style={styles.rightIcon}>
          <Ionicons name={rightIcon} size={18} color="#EAF2FF" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** -------- Styles -------- */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  card: {
    width: "94%",
    borderRadius: 22,
    overflow: "hidden",
  },
  inner: {
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  emoji: { textAlign: "center", fontSize: 18, color: "#fff", marginBottom: 4 },
  title: { textAlign: "center", fontSize: 28, fontWeight: "800", color: "#fff" },
  subtitle: { textAlign: "center", color: "rgba(255,255,255,0.9)", marginTop: 6, marginBottom: 12 },
  field: {
    marginTop: 14,
    height: 50,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  leftIcon: { width: 44, height: 50, alignItems: "center", justifyContent: "center", borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  rightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 6 },
  termsRow: { flexDirection: "row", alignItems: "center", marginTop: 16, flexWrap: "wrap" },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.8)",
    marginRight: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxOn: { backgroundColor: "rgba(16,185,129,0.95)", borderColor: "transparent" },
  termsText: { color: "rgba(255,255,255,0.9)", fontSize: 14 },
  link: { color: "#EAF2FF", textDecorationLine: "underline", fontWeight: "700" },
  cta: { height: 54, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  haveAccount: { color: "rgba(255,255,255,0.9)", fontWeight: "700", textAlign: "center" },
});
