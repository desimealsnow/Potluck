import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import SupabaseAuthUI from './src/screens/Auth/SupabaseAuthUI';
import { ThemeProvider } from './src/theme';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_700Bold } from '@expo-google-fonts/manrope';
import { View } from 'react-native';

/**
 * Renders the main application component with font loading and navigation.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Manrope_700Bold,
  });

  if (!fontsLoaded) {
    return <View />;
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
