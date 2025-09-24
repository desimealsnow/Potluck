import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

export default ({ config }: { config: ExpoConfig }) => ({
  ...config,
  extra: {
    ...config.extra,
    ...(process.env.BYPASS_PHONE_VALIDATION || process.env.EXPO_PUBLIC_BYPASS_PHONE_VALIDATION
      ? { EXPO_PUBLIC_BYPASS_PHONE_VALIDATION: (process.env.BYPASS_PHONE_VALIDATION || process.env.EXPO_PUBLIC_BYPASS_PHONE_VALIDATION) as string }
      : {}),
  },
});


