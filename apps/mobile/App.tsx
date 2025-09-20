import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SupabaseAuthUI from './src/screens/Auth/SupabaseAuthUI';
import { ThemeProvider } from './src/theme';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_700Bold } from '@expo-google-fonts/manrope';
import { View } from 'react-native';

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
        <SupabaseAuthUI />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
