type LoginScreenParams = {
  /**
   * Optional redirect target after a successful login.
   * Used by deep-link flow: if a user opens a preview link while logged out,
   * we navigate to Login with a redirect back to the Preview screen.
   */
  redirectTo?: 'Preview';
  redirectParams?: {
    appId: string;
    appName?: string;
    bundleUrl?: string;
  };
};

export type RootStackParamList = {
  Login: LoginScreenParams | undefined;
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