# PreVue Architecture Explanation

## 🎯 **The Big Picture: What We're Building**

Think of PreVue as a **"App Store Preview"** - like when you're in the App Store and you can preview an app before downloading it. But instead of just screenshots, you can actually **run the app** inside PreVue.

## 📦 **1. Complete App Bundle - What is it?**

### **Simple Analogy:**
Think of a **"Complete App Bundle"** like a **"Portable App"** on your computer.

- **Normal App**: Needs to be installed with all its dependencies
- **Portable App**: Contains everything it needs in one folder, can run anywhere

### **In React Native Terms:**
```bash
# This command creates a "portable version" of your app
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output bundles/AwesomeProject/complete-app.bundle \
  --assets-dest bundles/AwesomeProject/
```

### **What This Does:**
1. **Takes your JavaScript code** (all your React components)
2. **Bundles it into one file** (like zipping all files together)
3. **Includes all assets** (images, fonts, etc.)
4. **Makes it "portable"** - can run without installing dependencies

### **Before vs After:**
```
Before (Normal App):
├── node_modules/ (1000+ files)
├── src/ (your code)
├── package.json (dependencies list)
└── android/ (native code)

After (Bundle):
└── complete-app.bundle (1 file with everything)
```

## 🌉 **2. Bridge Architecture - What is it?**

### **Simple Analogy:**
Think of a **"Bridge"** like a **"Translator"** between two people who speak different languages.

- **Embedded App**: Speaks "JavaScript" 
- **PreVue**: Speaks "Native Android"
- **Bridge**: Translates between them

### **The Problem We Solved:**
```
❌ OLD WAY (Doesn't Work):
PreVue needs to install EVERY possible library:
├── react-native-camera
├── react-native-gallery  
├── react-native-location
├── react-native-bluetooth
└── ... (1000+ other libraries)

✅ NEW WAY (Bridge):
PreVue stays clean, apps use bridge:
PreVue: "I have camera access"
App: "Can I use camera?"
Bridge: "Yes, here's how"
```

### **How Bridge Works:**
```typescript
// In AwesomeProject (embedded app)
import { requestCameraAccess } from './src/utils/bridge';

// This asks PreVue: "Can I use camera?"
const cameraGranted = await requestCameraAccess();
```

```kotlin
// In PreVue (container app)
class EmbeddedAppBridgeModule {
    fun requestCameraAccess(promise: Promise) {
        // PreVue responds: "Yes, here's camera access"
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        activity.startActivityForResult(intent, CAMERA_REQUEST_CODE)
    }
}
```

## 🔄 **3. How Everything Works Together**

### **Step-by-Step Flow:**

#### **Step 1: App Creation**
```
Developer creates AwesomeProject
├── Writes React Native code
├── Uses camera, gallery, etc.
└── Tests locally
```

#### **Step 2: Bundle Creation**
```bash
# Developer runs this command
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output bundles/AwesomeProject/complete-app.bundle --assets-dest bundles/AwesomeProject/
```

**What happens:**
- All JavaScript code → 1 file
- All images, fonts → bundled
- App becomes "portable"

#### **Step 3: Integration with PreVue**
```bash
# Copy bundle to PreVue
cp bundles/AwesomeProject/complete-app.bundle /path/to/PreVue/android/app/src/main/assets/awesome/
```

#### **Step 4: PreVue Loads the App**
```kotlin
// PreVue loads the bundle
rootView.startReactApplication(instanceManager, "AwesomeProject", null)
```

#### **Step 5: App Runs Inside PreVue**
```
PreVue App
├── PreVue UI (navigation, etc.)
└── Embedded AwesomeProject
    ├── Runs from bundle
    ├── Uses bridge for native features
    └── Works like a real app
```

## 🎯 **4. Real-World Example**

### **Scenario: User wants to preview AwesomeProject**

1. **User opens PreVue app**
2. **Clicks "Preview AwesomeProject"**
3. **PreVue loads the bundle** (like opening a portable app)
4. **AwesomeProject appears** inside PreVue
5. **User can interact** with AwesomeProject normally
6. **When AwesomeProject needs camera** → asks bridge
7. **Bridge provides camera access** through PreVue's permissions

### **What User Sees:**
```
┌─────────────────────────┐
│ PreVue App              │
│ ┌─────────────────────┐ │
│ │ AwesomeProject      │ │ ← Embedded app
│ │ ┌─────────────────┐ │ │
│ │ │ Camera Button   │ │ │ ← User clicks
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

## 🔧 **5. Technical Benefits**

### **For PreVue (Platform):**
- ✅ **No dependency conflicts** - doesn't need user app libraries
- ✅ **Scalable** - can preview any React Native app
- ✅ **Clean architecture** - stays simple and maintainable
- ✅ **Universal** - works with any app

### **For Embedded Apps:**
- ✅ **Self-contained** - includes everything needed
- ✅ **Portable** - can run in any preview environment
- ✅ **Native access** - can use camera, gallery, etc. through bridge
- ✅ **Fallback support** - works even if bridge isn't available

## 🧪 **6. Testing the Concept**

### **Try This:**
1. **Open PreVue app**
2. **Navigate to Preview screen**
3. **Click on AwesomeProject**
4. **Notice:**
   - App loads instantly (from bundle)
   - Touch and scroll work (bridge handles events)
   - Camera/gallery buttons show messages (bridge responses)

### **What's Happening Behind the Scenes:**
```
1. PreVue loads bundle file
2. Creates React Native environment
3. Runs AwesomeProject code
4. Bridge handles native requests
5. User sees seamless experience
```

## 🏗️ **7. Detailed Architecture**

### **File Structure:**
```
PreVue/
├── android/app/src/main/
│   ├── assets/awesome/
│   │   └── complete-app.bundle  ← Embedded app bundle
│   └── java/com/prevue/
│       └── PreviewViewManager.kt ← Core preview manager
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx       ← PreVue home screen
│   │   └── PreviewScreen.tsx    ← Preview container
│   └── components/
└── App.tsx                      ← Main PreVue app

AwesomeProject/
├── src/
│   ├── components/              ← App screens
│   └── utils/
│       └── bridge.ts            ← Bridge interface
├── bundles/
│   └── AwesomeProject/
│       └── complete-app.bundle  ← Generated bundle
└── App.tsx                      ← Main app component
```

### **Code Flow:**
```typescript
// 1. PreVue loads bundle
<PreviewView componentName="AwesomeProject" />

// 2. PreviewViewManager creates ReactRootView
val rootView = ReactRootView(reactContext)

// 3. Bundle is loaded into ReactRootView
rootView.startReactApplication(instanceManager, "AwesomeProject", null)

// 4. AwesomeProject runs inside PreVue
// 5. When AwesomeProject needs native features:
const cameraAccess = await requestCameraAccess();

// 6. Bridge handles the request
// 7. PreVue provides native functionality
```

## 🔄 **8. Bundle Creation Process**

### **Step-by-Step Bundle Creation:**

#### **1. Prepare the App**
```bash
cd AwesomeProject
npm install
```

#### **2. Create Bundle Directory**
```bash
mkdir -p bundles/AwesomeProject
```

#### **3. Generate Bundle**
```bash
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output bundles/AwesomeProject/complete-app.bundle \
  --assets-dest bundles/AwesomeProject/
```

#### **4. Copy to PreVue**
```bash
cp bundles/AwesomeProject/complete-app.bundle /path/to/PreVue/android/app/src/main/assets/awesome/
```

#### **5. Rebuild PreVue**
```bash
cd PreVue
cd android && ./gradlew assembleDebug
```

## 🌉 **9. Bridge Implementation Details**

### **Bridge Interface (AwesomeProject):**
```typescript
// src/utils/bridge.ts
interface EmbeddedAppBridge {
  requestCameraAccess(): Promise<boolean>;
  requestGalleryAccess(): Promise<boolean>;
}

// Try to get bridge, fallback to mock if not available
const getBridge = (): EmbeddedAppBridge | null => {
  try {
    return NativeModules.EmbeddedAppBridge || null;
  } catch (error) {
    return null;
  }
};

// Fallback implementation
const mockBridge: EmbeddedAppBridge = {
  requestCameraAccess: async () => {
    console.warn('Camera access not available in preview mode');
    return false;
  },
  requestGalleryAccess: async () => {
    console.warn('Gallery access not available in preview mode');
    return false;
  }
};

export const bridge = getBridge() || mockBridge;
```

### **Bridge Usage (AwesomeProject):**
```typescript
// In App.tsx or components
import { requestCameraAccess, requestGalleryAccess } from './src/utils/bridge';

const handleCameraAccess = async () => {
  try {
    const granted = await requestCameraAccess();
    if (granted) {
      Alert.alert('Success', 'Camera access granted through bridge!');
    } else {
      Alert.alert('Permission Denied', 'Camera access denied');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to access camera: ' + error);
  }
};
```

## 🔧 **10. PreVue Integration**

### **PreviewViewManager (Kotlin):**
```kotlin
class PreviewViewManager : SimpleViewManager<ReactRootView>() {
    
    // Creates ReactRootView for embedded app
    override fun createViewInstance(reactContext: ThemedReactContext): ReactRootView {
        val rootView = ReactRootView(reactContext)
        
        // Load bundle from assets
        val bundlePath = "assets://awesome/complete-app.bundle"
        
        // Start React application
        rootView.startReactApplication(instanceManager, "AwesomeProject", null)
        
        return rootView
    }
}
```

### **PreviewScreen (React Native):**
```typescript
// src/screens/PreviewScreen.tsx
import { PreviewView } from '../components/PreviewView';

const PreviewScreen = () => {
  return (
    <View style={styles.container}>
      <PreviewView componentName="AwesomeProject" />
    </View>
  );
};
```

## 🎯 **11. Key Concepts Summary**

### **Bundle = Portable App**
- **Contains everything needed** to run the app
- **No installation required** - just load and run
- **Can be loaded anywhere** - PreVue, other platforms, etc.

### **Bridge = Universal Interface**
- **Connects embedded apps** to native features
- **Keeps PreVue independent** of user app dependencies
- **Provides fallback** when native modules aren't available

### **Architecture = Scalable Solution**
- **PreVue stays clean** - no user app dependencies
- **Any app can be embedded** - universal compatibility
- **No dependency conflicts** - isolated environments

## ❓ **12. Common Questions & Answers**

### **Q: Why not just install all libraries in PreVue?**
**A:** Different apps need different libraries, and they might conflict with each other. For example:
- App A needs `react-native-camera@3.0.0`
- App B needs `react-native-camera@4.0.0`
- These versions conflict and can't be installed together

### **Q: Why use a bridge instead of direct access?**
**A:** PreVue doesn't know what libraries each app will need, so it provides a universal interface that any app can use.

### **Q: What if an app needs a library PreVue doesn't have?**
**A:** The bridge provides fallback responses, so the app doesn't crash. It shows appropriate messages instead.

### **Q: How does touch and scroll work?**
**A:** PreVue's PreviewViewManager handles all touch events and passes them to the embedded app, making it feel like a native experience.

### **Q: Can I preview any React Native app?**
**A:** Yes! Any React Native app can be bundled and embedded in PreVue using this architecture.

## 🚀 **13. Future Enhancements**

### **Potential Improvements:**
- **Real-time bundle updates** - update apps without rebuilding PreVue
- **Multiple app support** - preview multiple apps simultaneously
- **Advanced bridge features** - more native module support
- **Performance optimizations** - faster loading and better memory management
- **Web support** - preview apps in web browsers

### **Advanced Use Cases:**
- **App Store previews** - preview apps before publishing
- **Enterprise testing** - test apps in controlled environments
- **Development workflow** - rapid prototyping and testing
- **Quality assurance** - comprehensive app testing

## 📚 **14. Additional Resources**

### **Related Documentation:**
- [React Native Bundling](https://reactnative.dev/docs/performance#bundling)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-intro)
- [Android Activity Lifecycle](https://developer.android.com/guide/components/activities/activity-lifecycle)

### **GitHub Repositories:**
- [PreVue Platform](https://github.com/Vetagiri-Hrushikesh/PreVue.git)
- [AwesomeProject Sample](https://github.com/Vetagiri-Hrushikesh/AwesomeProject.git)

---

**Note:** This architecture provides a scalable, maintainable solution for previewing React Native apps. The bundle approach ensures portability, while the bridge architecture maintains clean separation of concerns and enables universal compatibility. 