export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Settings: undefined;
  Preview: { appId: string };
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