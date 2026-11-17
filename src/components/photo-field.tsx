import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

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
  /** True until the photo is stored or removed, including after a failed upload. */
  onHoldChange?: (held: boolean) => void;
  /** Second URL when the first preview is hotlink-blocked. */
  fallbackUrl?: string | null;
  /** Page the photo came from, sent as Referer while loading the remote image. */
  referrer?: string | null;
  onRemoteError?: () => void;
};

export function PhotoField({
  value,
  onChange,
  onBusyChange,
  onHoldChange,
  fallbackUrl,
  referrer,
  onRemoteError,
}: PhotoFieldProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const triedFallback = useRef(false);
  const pending = useRef<ImagePickerAsset | null>(null);

  useEffect(() => {
    triedFallback.current = false;
  }, [value, fallbackUrl]);

  const shown = localUri || value;
  const hasPhoto = Boolean(shown.trim());

  function hold(next: boolean) {
    onHoldChange?.(next);
  }

  async function upload(asset: ImagePickerAsset) {
    setError(null);
    setBusy(true);
    onBusyChange?.(true);
    hold(true);
    setProgress(0);
    setLocalUri(asset.uri);
    try {
      const url = await uploadGiftPhoto(asset, (fraction) => setProgress(fraction));
      pending.current = null;
      onChange(url);
      setLocalUri(null);
      setProgress(null);
      hold(false);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : 'Couldn’t add that photo');
      hold(true);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  async function addFrom(source: 'library' | 'camera') {
    setError(null);
    try {
      const asset = await pickGiftPhoto(source);
      if (!asset) return;
      pending.current = asset;
      await upload(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add that photo');
    }
  }

  function remove() {
    pending.current = null;
    setLocalUri(null);
    setError(null);
    setProgress(null);
    hold(false);
    onChange('');
  }

  const status =
    progress == null
      ? 'Adding…'
      : progress < 0.3
        ? 'Preparing…'
        : `Uploading ${Math.round(progress * 100)}%`;

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
            <ActivityIndicator accessibilityLabel={status} color="#FFFFFF" />
            <ThemedText type="small" style={styles.status}>
              {status}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <Button
        label={busy ? status : hasPhoto ? 'Replace photo' : 'Add photo'}
        variant="secondary"
        icon="photo"
        disabled={busy}
        onPress={() => void addFrom('library')}
      />
      <Button label="Take photo" variant="ghost" disabled={busy} onPress={() => void addFrom('camera')} />

      {error ? (
        <View style={styles.retry}>
          <ThemedText type="small" themeColor="accent">
            {error}
          </ThemedText>
          {pending.current ? (
            <Button label="Retry" variant="secondary" onPress={() => pending.current && void upload(pending.current)} />
          ) : null}
        </View>
      ) : null}

      {pasteOpen ? (
        <TextField
          label="Photo URL"
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={value}
          onChangeText={(next) => {
            pending.current = null;
            setError(null);
            hold(false);
            onChange(next);
          }}
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
            <NativePressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={remove} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Remove
              </ThemedText>
            </NativePressable>
          ) : null}
        </View>
      )}
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
    gap: Spacing.two,
  },
  status: {
    color: '#FFFFFF',
  },
  retry: {
    gap: Spacing.two,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    maxWidth: '100%',
  },
});
