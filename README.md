# PreVue - React Native App Preview Platform

A powerful React Native platform designed to preview and test other React Native applications in a containerized environment. PreVue provides a scalable solution for previewing user-generated React Native apps without requiring dependencies for each individual app.

## 🚀 Features

- **Universal App Preview**: Preview any React Native app without adding dependencies
- **Touch & Scroll Support**: Full touch interaction and scrolling capabilities
- **Bridge Architecture**: Native module access through bridge system
- **Scalable Design**: Handle multiple apps without dependency conflicts
- **Clean Architecture**: Independent of user app dependencies
- **Real-time Preview**: Instant app loading and switching

## 📱 Screens

### Home Screen
- Welcome to PreVue platform
- Quick access to available apps
- Platform information and status

### Preview Screen
- Embedded app container
- Touch and scroll support
- Real-time app preview
- Bridge functionality for native modules

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vetagiri-Hrushikesh/PreVue.git
   cd PreVue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS Setup (macOS only)**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Run the app**
   ```bash
   # For Android
   npx react-native run-android
   
   # For iOS
   npx react-native run-ios
   ```

## 📦 App Integration

### Adding Apps to PreVue

1. **Create app bundle** using the bundling commands from the target app
2. **Copy bundle to assets directory**:
   ```bash
   cp /path/to/app/bundle /path/to/PreVue/android/app/src/main/assets/awesome/
   ```
3. **Rebuild PreVue** with the new bundle
4. **Test integration** in the preview environment

### Bundle Requirements

Apps must be bundled with the following specifications:
- **Platform**: Android
- **Mode**: Production (--dev false)
- **Entry**: index.js
- **Output**: Complete app bundle with assets

### Example Bundle Command
```bash
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output bundles/AppName/complete-app.bundle \
  --assets-dest bundles/AppName/
```

## 🔧 Architecture

### Bridge System
PreVue implements a bridge architecture that allows embedded apps to access native functionality:

- **Independent Dependencies**: PreVue doesn't require user app dependencies
- **Bridge Interface**: Embedded apps communicate through bridge
- **Fallback Handling**: Graceful degradation when native modules aren't available
- **Permission Management**: Centralized permission handling

### PreviewViewManager
The core component responsible for embedding React Native apps:

- **Multiple Instance Support**: Handle multiple app instances
- **Touch Event Handling**: Proper touch and scroll support
- **Activity Context Management**: Native module support
- **Error Handling**: Robust error recovery and retry mechanisms

### Key Features
- **Isolated App Contexts**: Each embedded app runs in its own context
- **Memory Management**: Proper cleanup and resource management
- **Performance Optimization**: Efficient bundle loading and caching
- **Error Recovery**: Automatic retry mechanisms for failed loads

## 🏗️ Project Structure

```
PreVue/
├── android/                    # Android-specific files
│   └── app/
│       └── src/main/
│           ├── assets/         # App bundles directory
│           │   └── awesome/    # Embedded app bundles
│           └── java/com/prevue/
│               └── PreviewViewManager.kt  # Core preview manager
├── ios/                       # iOS-specific files
├── src/
│   ├── screens/              # App screens
│   │   ├── HomeScreen.tsx    # Home screen component
│   │   └── PreviewScreen.tsx # Preview screen component
│   └── components/           # Reusable components
├── App.tsx                   # Main app component
├── index.js                  # Entry point
├── package.json              # Dependencies and scripts
└── README.md                # This file
```

## 🔌 Dependencies

### Core Dependencies
- `react-native`: Core React Native framework
- `react-native-vector-icons`: Icon library

### Development Dependencies
- `@types/react`: TypeScript definitions for React
- `@types/react-native`: TypeScript definitions for React Native

## 🧪 Testing

### Manual Testing
1. **App Loading**: Test loading different embedded apps
2. **Touch Interactions**: Verify touch and scroll work in embedded apps
3. **Navigation**: Test navigation within embedded apps
4. **Bridge Functionality**: Test native module access through bridge

### Integration Testing
1. **Bundle Loading**: Ensure app bundles load correctly
2. **Performance**: Test with multiple app instances
3. **Memory Usage**: Monitor memory consumption
4. **Error Handling**: Test error recovery mechanisms

## 🚀 Deployment

### For Development
1. Follow the setup instructions above
2. Run the app on device or simulator
3. Test with various embedded apps

### For Production
1. Build production APK/IPA
2. Deploy to app stores or internal distribution
3. Configure app bundle management system

## 📋 Permissions

PreVue includes comprehensive permissions to support embedded app functionality:

### Android Permissions
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
```

## 🔗 Related Projects

- [AwesomeProject](https://github.com/Vetagiri-Hrushikesh/AwesomeProject.git) - Sample app for PreVue integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation

## 🎯 Use Cases

### App Development
- **Rapid Prototyping**: Quickly preview app changes
- **Testing**: Test apps in different environments
- **Demo**: Showcase apps to stakeholders

### Platform Development
- **App Store**: Preview apps before publishing
- **Enterprise**: Internal app distribution and testing
- **Education**: Teaching React Native development

### Integration Scenarios
- **CI/CD**: Automated app testing
- **Quality Assurance**: Comprehensive app testing
- **User Acceptance Testing**: Client app review

---

**Note**: PreVue is designed to be a universal preview platform. It provides a clean, scalable architecture that can handle any React Native app without requiring dependencies for each individual app. The bridge architecture ensures that embedded apps can access native functionality while maintaining platform independence.
