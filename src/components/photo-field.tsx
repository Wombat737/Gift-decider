import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { GiftPhoto } from '@/components/gift-photo';
import { LabelWithHelp } from '@/components/help-tip';
import { NativePressable } from '@/components/native-pressable';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FieldHelp } from '@/lib/help';
import { pickGiftPhoto, uploadGiftPhoto } from '@/services/item-image';

type PhotoFieldProps = {
  value: string;
  onChange: (imageUrl: string) => void;
  onBusyChange?: (busy: boolean) => void;
  /** Second URL when the first preview is hotlink-blocked. */
  fallbackUrl?: string | null;
  /** Page the photo came from, sent as Referer while loading the remote image. */
  referrer?: string | null;
  onRemoteError?: () => void;
};

export function PhotoField({ value, onChange, onBusyChange, fallbackUrl, referrer, onRemoteError }: PhotoFieldProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedFallback = useRef(false);

  useEffect(() => {
    triedFallback.current = false;
  }, [value, fallbackUrl]);

  const shown = localUri || value;
  const hasPhoto = Boolean(shown.trim());

  async function addFrom(source: 'library' | 'camera') {
    setError(null);
    setBusy(true);
    onBusyChange?.(true);
    try {
      const asset = await pickGiftPhoto(source);
      if (!asset) return;
      setLocalUri(asset.uri);
      const url = await uploadGiftPhoto(asset);
      onChange(url);
      setLocalUri(null);
    } catch (err) {
      setLocalUri(null);
      setError(err instanceof Error ? err.message : 'Couldn’t add that photo');
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <LabelWithHelp label="Photo" help={FieldHelp.photo} />

      <View style={[styles.preview, { borderColor: theme.border }]}>
        <GiftPhoto
          uri={shown}
          referrer={referrer}
          onLoadError={() => {
            if (busy) return true;
            if (fallbackUrl && fallbackUrl !== value && !triedFallback.current) {
              triedFallback.current = true;
              onChange(fallbackUrl);
              return true;
            }
            onRemoteError?.();
            return false;
          }}
        />
        {busy ? (
          <View style={[styles.busy, { backgroundColor: theme.overlay }]} pointerEvents="none">
            <ActivityIndicator accessibilityLabel="Uploading photo" color={theme.brand} />
          </View>
        ) : null}
      </View>

      <Button
        label={busy ? 'Adding…' : hasPhoto ? 'Replace photo' : 'Add photo'}
        variant="secondary"
        icon="photo"
        disabled={busy}
        onPress={() => void addFrom('library')}
      />
      <Button
        label="Take photo"
        variant="ghost"
        disabled={busy}
        onPress={() => void addFrom('camera')}
      />

      {pasteOpen ? (
        <TextField
          label="Photo URL"
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={value}
          onChangeText={onChange}
        />
      ) : (
        <View style={styles.links}>
          <NativePressable
            accessibilityRole="button"
            accessibilityLabel="Paste a photo URL"
            onPress={() => setPasteOpen(true)}
            hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              or paste a URL
            </ThemedText>
          </NativePressable>
          {hasPhoto ? (
            <NativePressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => {
                setLocalUri(null);
                onChange('');
              }}
              hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Remove
              </ThemedText>
            </NativePressable>
          ) : null}
        </View>
      )}

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  preview: {
    width: '100%',
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    maxWidth: '100%',
  },
});
