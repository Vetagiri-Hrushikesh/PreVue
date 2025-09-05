export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Preview: { appId: string; appName: string; bundleUrl?: string };
};

export type MainTabParamList = {
  Home: undefined;
  MyApps: undefined;
  Settings: undefined;
};

export interface Metric {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
  bgColor: string;
}

export interface App {
  id: string;
  name: string;
  lastPreviewed: string;
  previews: number;
  rating: number;
} 