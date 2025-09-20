import { registerRootComponent } from 'expo';

import App from './App';
import { setTheme } from './src/theme';
import { Appearance } from 'react-native';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// Initialize theme from system preference and subscribe to changes
setTheme(Appearance.getColorScheme() || 'light');
Appearance.addChangeListener(({ colorScheme }) => {
  if (colorScheme) setTheme(colorScheme);
});

registerRootComponent(App);
