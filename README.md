# PreVue - React Native App Preview Platform

A beautiful React Native application for previewing and managing mobile apps with a modern Material Design-inspired UI.

## 🚀 Features

- **Beautiful Login Screen**: Modern login interface with social login options
- **Clean Dashboard**: Minimalistic design with key metrics (Conversions & Users)
- **Reliable App Preview System**: Native Android preview functionality with retry mechanisms
- **Bottom Navigation**: Easy navigation between Home and Settings
- **Organized Codebase**: Clean folder structure with reusable components

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── MetricCard.tsx   # Dashboard metric cards
│   └── AppCard.tsx      # App preview cards
├── screens/             # Screen components
│   ├── LoginScreen.tsx  # Login screen
│   ├── HomeScreen.tsx   # Dashboard screen
│   ├── SettingsScreen.tsx # Settings screen
│   └── PreviewScreen.tsx # App preview screen
├── constants/           # App constants
│   └── colors.ts        # Color palette and theming
├── types/               # TypeScript type definitions
│   └── navigation.ts    # Navigation and app types
└── utils/               # Utility functions (future use)
```

## 🎨 Design System

### Colors
- **Primary**: `#1976d2` (Blue)
- **Secondary**: `#9c27b0` (Purple)
- **Success**: `#4caf50` (Green)
- **Warning**: `#ff9800` (Orange)
- **Error**: `#f44336` (Red)

### Components
- **Clean Dashboard**: Only essential metrics (Conversions & Users)
- **Reliable Preview**: Loading states and retry mechanisms
- **Bottom Navigation**: Home and Settings tabs
- **Consistent Styling**: Material Design-inspired shadows and spacing

## 🔧 Setup & Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Additional Dependencies**:
   ```bash
   npm install @react-native-material/core iconsax-react-nativejs react-native-svg
   ```

3. **Run on Android**:
   ```bash
   npx react-native run-android
   ```

## 🔐 Login Credentials

Use these credentials to login:
- **Email**: `info@phoenixcoded.co`
- **Password**: `123456`

## 📱 App Flow

1. **Login Screen**: Beautiful login with social options
2. **Dashboard**: Clean overview with metrics and app list
3. **App Preview**: Click "Preview" to see the AwesomeProject (now with loading states)
4. **Settings**: Access via bottom navigation

## 🛠️ Technical Details

### Native Android Integration
- **Improved PreviewViewManager**: Added retry mechanisms and better error handling
- **Reliable Bundle Loading**: Preloading and initialization states
- **Robust Preview System**: Multiple retry attempts with proper cleanup

### React Native Features
- **TypeScript**: For type safety
- **React Navigation**: For routing
- **Iconsax Icons**: For consistent iconography
- **Material Design**: Principles and styling

### Performance Optimizations
- **Loading States**: Proper loading indicators and error handling
- **Retry Mechanisms**: Automatic retry on failures
- **Efficient Navigation**: Bottom tab navigation
- **Clean UI**: Minimalistic design without clutter

## 🎯 Key Components

### MetricCard
```typescript
interface Metric {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
  bgColor: string;
}
```

### AppCard
```typescript
interface App {
  id: string;
  name: string;
  lastPreviewed: string;
  previews: number;
  rating: number;
}
```

## 🔄 Navigation Flow

```
Login → Home (Dashboard) → Preview (AwesomeProject)
                ↓
            Settings
```

## 📊 Dashboard Metrics

- **Conversions**: 2,847 (+12.5%)
- **Users**: 1,234 (+8.2%)

## 🎨 UI/UX Features

- **Minimalistic Design**: Clean, uncluttered interface
- **Loading States**: Proper loading indicators for preview
- **Error Handling**: User-friendly error messages with retry options
- **Bottom Navigation**: Easy access to Home and Settings
- **Reliable Preview**: Works consistently on first attempt
- **Modern Icons**: Iconsax icon library integration

## 🔧 Reliability Improvements

### Preview System
- **Preloading**: Instance managers are preloaded for faster startup
- **Retry Mechanism**: Up to 3 automatic retry attempts on failures
- **Loading States**: Visual feedback during preview loading
- **Error Recovery**: Proper cleanup and state management
- **Async Handling**: Better timing for native component initialization

### Native Android
- **Enhanced PreviewViewManager**: Better lifecycle management
- **Retry Logic**: Automatic retry with exponential backoff
- **State Tracking**: Proper tracking of initialization states
- **Memory Management**: Efficient cleanup of unused resources

## 🚀 Future Enhancements

- [ ] Add more apps to preview
- [ ] Implement real analytics
- [ ] Add user profiles
- [ ] Social sharing features
- [ ] Push notifications
- [ ] Dark mode support
- [ ] Offline preview support

## 📝 License

MIT License - feel free to use this project for your own applications.

---

Built with ❤️ using React Native and modern development practices.
