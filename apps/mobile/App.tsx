import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SupabaseAuthUI from './src/screens/Auth/SupabaseAuthUI';

export default function App() {
  return (
    <SafeAreaProvider>
      <SupabaseAuthUI />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
