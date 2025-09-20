## UI Refresh - Potluck Mobile

Summary of the visual refresh and primitives introduced for the RN app:

- Tokens: `.design/tokens.json` with brand, neutral, state, radius, shadow, space, font
- Theme: `apps/mobile/src/theme/index.ts` exports tokens and `ThemeProvider` (dark/system, reduced motion)
- Fonts: Inter + Manrope loaded in `App.tsx`
- Icons: `lucide-react-native` via `Icon` wrapper in `apps/mobile/src/components/ui/Icon.tsx`
- Primitives in `apps/mobile/src/components/ui/`:
  - Button, Input, Card, Chip, Label, Segmented
  - Banner, ProgressBar, EmptyState

How to use

1) Wrap the app with ThemeProvider (already wired in `apps/mobile/App.tsx`):

```tsx
import { ThemeProvider } from '@/theme';

export default function App() {
  return (
    <ThemeProvider>
      {/* ... */}
    </ThemeProvider>
  );
}
```

2) Use primitives with tokens:

```tsx
import { Card, Button, Input, Segmented, Icon, ProgressBar } from '@/components';

<Card title="Example">
  <Input placeholder="Your name" />
  <Button title="Save" onPress={() => {}} />
  <ProgressBar value={0.6} />
</Card>
```

3) Icons

```tsx
import { Icon } from '@/components';
<Icon name="Calendar" size={20} color="#fff" />
```

4) Theme access & reduced motion

```tsx
import { useTheme } from '@/theme';
const { colors, reducedMotion, colorScheme, tokens } = useTheme();
```

Applied updates:

- Explore/Event List: gradient header, token colors, Icon wrapper, improved diet tags
- Event Details: token gradient header, action buttons using Icon, Items tab uses ProgressBar with category colors
- Participants: tokenized styles, Icon wrapper, cleaner cards
- Settings: theme toggle, Icon wrapper, tokenized cards
- Notifications: Icon wrapper and consistent card visuals

Category colors:

- Appetizer `#06B6D4`, Main `#22C55E`, Side `#84CC16`, Dessert `#F472B6`, Beverage `#38BDF8`, Supplies `#F59E0B`

Notes:

- Animations respect reduced motion via `ThemeProvider`
- Continue migrating any remaining Ionicons to `Icon`
- Keep contrast ≥ 4.5 when adjusting colors

Linting & a11y

- ESLint flat config at `apps/mobile/eslint.config.js` includes rules to discourage inline styles/colors and hex literals
- Basic accessibility roles/labels added for Button, Input, Segmented


