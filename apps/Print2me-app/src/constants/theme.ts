import { Platform } from 'react-native';

export const Palette = {
  paper: '#FAF7F2',
  surface: '#FFFFFF',
  ink: {
    DEFAULT: '#0E1A3A',
    soft: '#4A5578',
    muted: '#8A94A6',
  },
  hairline: '#E7E1D6',
  saffron: {
    DEFAULT: '#FF8A1F',
    tint: '#FFF1E0',
    dark: '#E06D05',
  },
  success: {
    DEFAULT: '#14A36B',
    tint: '#E4F6EE',
  },
  warning: {
    DEFAULT: '#E8A200',
    tint: '#FEF7E6',
  },
  danger: {
    DEFAULT: '#D64545',
    tint: '#FDE8E8',
  },
} as const;

export const Colors = {
  light: {
    text: Palette.ink.DEFAULT,
    textSecondary: Palette.ink.soft,
    textMuted: Palette.ink.muted,
    background: Palette.paper,
    surface: Palette.surface,
    border: Palette.hairline,
    primary: Palette.saffron.DEFAULT,
    primaryTint: Palette.saffron.tint,
    success: Palette.success.DEFAULT,
    successTint: Palette.success.tint,
    warning: Palette.warning.DEFAULT,
    warningTint: Palette.warning.tint,
    danger: Palette.danger.DEFAULT,
    dangerTint: Palette.danger.tint,
  },
  dark: {
    text: '#FAF7F2',
    textSecondary: '#A0AEC0',
    textMuted: '#718096',
    background: '#0B1120',
    surface: '#151E32',
    border: '#24324D',
    primary: Palette.saffron.DEFAULT,
    primaryTint: '#2E1E10',
    success: Palette.success.DEFAULT,
    successTint: '#0C2D1F',
    warning: Palette.warning.DEFAULT,
    warningTint: '#352504',
    danger: Palette.danger.DEFAULT,
    dangerTint: '#381414',
  },
} as const;

export const Typography = {
  mono: Platform.select({ ios: 'Courier', default: 'monospace' }),
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 30,
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Shadows = {
  soft: Platform.select({
    ios: {
      shadowColor: '#0E1A3A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: '#0E1A3A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
};
