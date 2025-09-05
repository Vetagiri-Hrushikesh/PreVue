// ==============================|| TYPES - CONFIG ||============================== //

export type ThemeMode = 'light' | 'dark';
export type ThemeDirection = 'ltr' | 'rtl';
export type MenuOrientation = 'vertical' | 'horizontal';
export type FontFamily = 'Inter' | 'Roboto' | 'Poppins' | 'Cairo' | 'Open Sans';
export type PresetColor = 'default' | 'theme1' | 'theme2' | 'theme3' | 'theme4' | 'theme5' | 'theme6' | 'theme7' | 'theme8';
export type I18n = 'en' | 'fr' | 'ro' | 'zh';

export interface CustomizationProps {
  // Theme
  mode: ThemeMode;
  presetColor: PresetColor;
  themeDirection: ThemeDirection;
  themeContrast: boolean;
  fontFamily: FontFamily;
  
  // Layout
  container: boolean;
  miniDrawer: boolean;
  menuOrientation: MenuOrientation;
  menuCaption: boolean;
  
  // Localization
  i18n: I18n;
  
  // Callbacks
  onChangeContainer: (container: string) => void;
  onChangeLocalization: (lang: I18n) => void;
  onChangeMode: (mode: ThemeMode) => void;
  onChangePresetColor: (theme: PresetColor) => void;
  onChangeDirection: (direction: ThemeDirection) => void;
  onChangeMiniDrawer: (miniDrawer: boolean) => void;
  onChangeThemeLayout: (direction: ThemeDirection, miniDrawer: boolean) => void;
  onChangeMenuOrientation: (layout: MenuOrientation) => void;
  onChangeMenuCaption: (menuCaption: string) => void;
  onChangeFontFamily: (fontFamily: FontFamily) => void;
  onChangeContrast: (themeContrast: string) => void;
}