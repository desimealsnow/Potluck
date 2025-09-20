## UI Refresh - Potluck Mobile

Summary of the visual refresh and primitives introduced for the RN app:

- Tokens: `.design/tokens.json` with brand, neutral, state, radius, shadow, space, font
- Theme: `apps/mobile/src/theme/index.ts` exports tokens and `ThemeProvider` (dark/system, reduced motion)
- Fonts: Inter + Manrope loaded in `App.tsx`
- Icons: `lucide-react-native` via `Icon` wrapper in `apps/mobile/src/components/ui/Icon.tsx`
- Primitives in `apps/mobile/src/components/ui/`:
  - Button, Input, Card, Chip, Label, Segmented
  - Banner, ProgressBar, EmptyState

Applied updates:

- Explore/Event List: gradient header, token colors, Icon wrapper, improved diet tags
- Event Details: token gradient header, action buttons using Icon, Items tab uses ProgressBar with category colors
- Participants: tokenized styles, Icon wrapper, cleaner cards
- Settings: theme toggle, Icon wrapper, tokenized cards
- Notifications: Icon wrapper and consistent card visuals

Category colors:

- Appetizer `#06B6D4`, Main `#22C55E`, Side `#84CC16`, Dessert `#F472B6`, Beverage `#38BDF8`, Supplies `#F59E0B`

Notes:

- Animations should respect reduced motion via `ThemeProvider`
- Continue migrating any remaining Ionicons to `Icon`
- Keep contrast ≥ 4.5 when adjusting colors

