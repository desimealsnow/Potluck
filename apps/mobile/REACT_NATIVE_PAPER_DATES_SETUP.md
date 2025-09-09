# React Native Paper Dates Setup

## Installation

```bash
cd apps/mobile
npm install react-native-paper-dates
```

## Dependencies

This package requires `react-native-paper` as a peer dependency:

```bash
npm install react-native-paper
```

## Platform Support

- ✅ **iOS**: Native date/time pickers
- ✅ **Android**: Material Design date/time pickers  
- ✅ **Web**: Web-compatible date/time pickers
- ✅ **Expo**: Full compatibility

## Features

- **DatePickerModal**: Beautiful calendar picker
- **TimePickerModal**: Clean time selection
- **Cross-platform**: Works on all platforms
- **Material Design**: Follows Material Design guidelines
- **Accessibility**: Full accessibility support

## Usage

The date/time pickers are now integrated into the CreateEvent screen:

- **Date Field**: Tap to open calendar picker
- **Time Field**: Tap to open time picker
- **Auto-close**: Pickers close automatically on selection
- **Validation**: Proper date/time validation

## Troubleshooting

If you encounter any issues:

1. Make sure both packages are installed
2. Clear Metro cache: `npx expo start --clear`
3. Restart the development server
