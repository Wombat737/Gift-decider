import { StyleSheet, View, type ViewProps } from 'react-native';

import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  padded?: boolean;
  raised?: boolean;
};

export function Card({ children, style, padded = true, raised = true, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        raised && CardShadow,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.two,
  },
  padded: {
    padding: Spacing.three,
  },
});
