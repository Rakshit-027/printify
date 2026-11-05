import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  type?: string;
};

export function ThemedView({ style, type = 'background', ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const backgroundColor = (theme as any)[type] || theme.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
