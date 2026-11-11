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
import { pickGiftPhoto, uploadGiftPhoto, type GiftPhotoSource } from '@/services/item-image';
import type * as ImagePicker from 'expo-image-picker';

type PhotoFieldProps = {
  value: string;
  onChange: (imageUrl: string) => void;
  onBusyChange?: (busy: boolean) => void;
  /** True while a chosen photo is not saved yet, including after a failed upload. */
  onHoldChange?: (held: boolean) => void;
  /** Second URL when the first preview is hotlink-blocked. */
  fallbackUrl?: string | null;
  /** Page the photo came from, sent as Referer while loading the remote image. */
  referrer?: string | null;
  onRemoteError?: () => void;
};

export function PhotoField({ value, onChange, onBusyChange, onHoldChange, fallbackUrl, referrer, onRemoteError }: PhotoFieldProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingAsset = useRef<ImagePicker.ImagePickerAsset | null>(null);
  const triedFallback = useRef(false);

  useEffect(() => {
    triedFallback.current = false;
  }, [value, fallbackUrl]);

  const shown = localUri || value;
  const hasPhoto = Boolean(shown.trim());

  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
    setError(null);
    setBusy(true);
    setProgress(0.02);
    onBusyChange?.(true);
    onHoldChange?.(true);
    pendingAsset.current = asset;
    setLocalUri(asset.uri);
    try {
      const url = await uploadGiftPhoto(asset, setProgress);
      onChange(url);
      pendingAsset.current = null;
      setLocalUri(null);
      onHoldChange?.(false);
      setProgress(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add that photo');
      setProgress(0);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  async function addFrom(source: GiftPhotoSource) {
    setError(null);
    try {
      const asset = await pickGiftPhoto(source);
      if (!asset) return;
      await uploadAsset(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add that photo');
    }
  }

  function retry() {
    const asset = pendingAsset.current;
    if (!asset) return;
    void uploadAsset(asset);
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
        {busy || error ? (
          <View style={[styles.busy, { backgroundColor: theme.overlay }]} pointerEvents="none">
            {busy ? <ActivityIndicator accessibilityLabel="Uploading photo" color={theme.brandText} /> : null}
            <ThemedText type="small" style={{ color: theme.brandText }}>
              {busy
                ? progress < 0.3
                  ? 'Preparing photo…'
                  : `Uploading photo… ${Math.round(progress * 100)}%`
                : error}
            </ThemedText>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((busy ? progress : 0) * 100)}%`, backgroundColor: theme.brandText }]} />
            </View>
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
                pendingAsset.current = null;
                setLocalUri(null);
                setError(null);
                onHoldChange?.(false);
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
        <View style={styles.links}>
          <ThemedText type="small" themeColor="accent">
            {error}
          </ThemedText>
          <NativePressable accessibilityRole="button" accessibilityLabel="Retry photo upload" onPress={retry} hitSlop={8}>
            <ThemedText type="smallBold">Retry</ThemedText>
          </NativePressable>
        </View>
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
    gap: Spacing.two,
    padding: Spacing.three,
  },
  track: {
    width: '70%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(251, 249, 244, 0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    maxWidth: '100%',
  },
});
