// App.tsx
import 'react-native-gesture-handler';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import PreviewScreen from './src/screens/PreviewScreen';
import { RootStackParamList } from './src/types/navigation';
import { JWTProvider } from './src/contexts/JWTContext';
import { AppsProvider } from './src/contexts/AppsContext';
import { SSEProvider } from './src/contexts/SSEContext';
import { ConfigProvider } from './src/contexts/ConfigContext';
import Loader from './src/components/Loader';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => (
  <ConfigProvider>
    <JWTProvider>
      <SSEProvider>
        <AppsProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen name="Preview" component={PreviewScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AppsProvider>
      </SSEProvider>
    </JWTProvider>
  </ConfigProvider>
);

export default App;
 