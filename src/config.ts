// ==============================|| CONFIG ||============================== //

import { CustomizationProps } from './types/config';

// Default configuration for React Native app
const config: CustomizationProps = {
  // Theme
  mode: 'light',
  presetColor: 'default',
  themeDirection: 'ltr',
  themeContrast: false,
  fontFamily: 'Inter',
  
  // Layout
  container: true,
  miniDrawer: false,
  menuOrientation: 'vertical',
  menuCaption: false,
  
  // Localization
  i18n: 'en',
  
  // Callbacks (will be set by ConfigProvider)
  onChangeContainer: () => {},
  onChangeLocalization: () => {},
  onChangeMode: () => {},
  onChangePresetColor: () => {},
  onChangeDirection: () => {},
  onChangeMiniDrawer: () => {},
  onChangeThemeLayout: () => {},
  onChangeMenuOrientation: () => {},
  onChangeMenuCaption: () => {},
  onChangeFontFamily: () => {},
  onChangeContrast: () => {}
};

export default config;