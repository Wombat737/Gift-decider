import { StyleSheet, View, type ViewProps } from 'react-native';

import { CardShadow, Radius, RingSelected, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  padded?: boolean;
  raised?: boolean;
  /** Press / selected coral-tint ring. */
  selected?: boolean;
};

export function Card({
  children,
  style,
  padded = true,
  raised = true,
  selected = false,
  ...rest
}: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        raised && CardShadow,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: selected ? RingSelected : theme.border,
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
