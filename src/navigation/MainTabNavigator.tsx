import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MyAppsTabScreen from '../screens/MyAppsTabScreen';
import SettingsTabScreen from '../screens/SettingsTabScreen';
import SimpleTabBar from '../components/SimpleTabBar';
import { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <SimpleTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="MyApps"
        component={MyAppsTabScreen}
        options={{
          tabBarLabel: 'My Apps',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTabScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
