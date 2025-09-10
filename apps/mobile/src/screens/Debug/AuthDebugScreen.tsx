import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/Button';
import { testAuthentication, testApiCall } from '../../utils/authTest';
import { supabase } from '../../config/supabaseClient';

interface AuthTestResult {
  hasSession: boolean;
  hasUser: boolean;
  sessionError?: string;
  userError?: string;
  error?: string;
}

interface ApiTestResult {
  status?: number;
  statusText?: string;
  body?: string;
  error?: string;
}

interface DebugResults {
  auth?: AuthTestResult;
  api?: ApiTestResult;
}

export default function AuthDebugScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DebugResults | null>(null);

  const runAuthTest = async () => {
    setLoading(true);
    try {
      const authResult = await testAuthentication();
      setResults({ auth: authResult });
    } catch (error) {
      console.error('Auth test failed:', error);
      Alert.alert('Error', 'Auth test failed');
    } finally {
      setLoading(false);
    }
  };

  const runApiTest = async () => {
    setLoading(true);
    try {
      const apiResult = await testApiCall();
      setResults((prev: DebugResults | null) => ({ ...prev, api: apiResult }));
    } catch (error) {
      console.error('API test failed:', error);
      Alert.alert('Error', 'API test failed');
    } finally {
      setLoading(false);
    }
  };

  const signInTest = async () => {
    setLoading(true);
    try {
      // You can change these credentials for testing
      const testEmail = 'test@example.com';
      const testPassword = 'password123';
      
      console.log('🔐 Attempting sign in with:', testEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        Alert.alert('Sign In Error', `Failed to sign in: ${error.message}`);
      } else {
        console.log('✅ Sign in successful:', data);
        Alert.alert('Success', 'Signed in successfully');
        runAuthTest(); // Re-run auth test
      }
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      Alert.alert('Error', `Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      Alert.alert('Success', 'Signed out successfully');
      setResults(null);
    } catch (error) {
      Alert.alert('Error', 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>🔐 Auth Debug Screen</Text>
          
          <Text style={styles.instructions}>
            Use this screen to debug authentication issues. Check the console for detailed logs.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Test Authentication"
              onPress={runAuthTest}
              loading={loading}
              style={styles.button}
            />
            
            <Button
              title="Test API Call"
              onPress={runApiTest}
              loading={loading}
              variant="secondary"
              style={styles.button}
            />
            
            <Button
              title="Sign In Test"
              onPress={signInTest}
              loading={loading}
              variant="ghost"
              style={styles.button}
            />
            
            <Button
              title="Sign Out"
              onPress={signOut}
              loading={loading}
              variant="danger"
              style={styles.button}
            />
            
            <Button
              title="Clear Results"
              onPress={clearResults}
              variant="ghost"
              style={styles.button}
            />
          </View>

          {results && (
            <View style={styles.results}>
              <Text style={styles.resultsTitle}>📊 Results:</Text>
              <Text style={styles.resultsText}>
                {JSON.stringify(results, null, 2)}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  instructions: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  button: {
    marginBottom: 10,
  },
  results: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  resultsText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
