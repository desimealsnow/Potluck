import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import SupabaseAuthUI from './src/features/auth/screens/SupabaseAuthUI';
import { ThemeProvider } from './src/theme';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_700Bold } from '@expo-google-fonts/manrope';
import { View, Text } from 'react-native';
import { useEffect } from 'react';

export default function App() {
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Manrope_700Bold,
  });

  useEffect(() => {
    console.log('[App] Fonts loaded:', fontsLoaded);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log('[App] Fonts not loaded yet');
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <SupabaseAuthUI />
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
