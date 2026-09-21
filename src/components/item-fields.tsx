import { useEffect, useRef, useState } from 'react';
import { Switch, View } from 'react-native';

import { LabelWithHelp } from '@/components/help-tip';
import { PhotoField } from '@/components/photo-field';
import { FilterChips, SUGGESTED_VIBES, VibeChips } from '@/components/vibe-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FieldHelp } from '@/lib/help';
import { applyBuyLinkDraft, BUY_LINK_AUTOFILL_FAIL, isWishlistImagesUrl, looksLikeCompleteBuyUrl, sanitizeBuyUrl, type BuyLinkFields } from '@/lib/link-preview';
import { useTheme } from '@/hooks/use-theme';
import type { ItemKind, Occasion } from '@/lib/types';
import { autofillFromBuyUrl, mirrorPreviewImage } from '@/services/preview';
import type { SharedPhoto } from '@/lib/share-intent';

export type ItemFieldsValue = {
  title: string;
  notes: string;
  imageUrl: string;
  buyUrl: string;
  sizeHint: string;
  targetAmount: string;
  tags: string[];
  itemKind: ItemKind;
  noSubstitution: boolean;
  occasionId: string | null;
};

type ItemFieldsProps = {
  value: ItemFieldsValue;
  occasions: Occasion[];
  onChange: (patch: Partial<ItemFieldsValue>) => void;
  showImageUrl?: boolean;
  onPhotoBusy?: (busy: boolean) => void;
  /** Fetch a draft as soon as the screen opens (share extension / deep link). */
  autofillBuyUrl?: boolean;
  /** Photo from the share sheet when the share had no URL. */
  sharedPhoto?: SharedPhoto | null;
};

export function ItemFields({
  value,
  occasions,
  onChange,
  showImageUrl = true,
  onPhotoBusy,
  autofillBuyUrl = false,
  sharedPhoto = null,
}: ItemFieldsProps) {
  const theme = useTheme();
  const valueRef = useRef(value);
  const buyUrlRef = useRef(value.buyUrl);
  const lastFetched = useRef('');
  const lastDraft = useRef<BuyLinkFields>({ title: '', notes: '', imageUrl: '' });
  const requestId = useRef(0);
  const [previewing, setPreviewing] = useState(false);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [imageFallback, setImageFallback] = useState<string | null>(null);
  const fallbackRef = useRef<string | null>(null);
  const mirroring = useRef(false);

  valueRef.current = value;
  buyUrlRef.current = value.buyUrl;

  useEffect(() => {
    if (autofillBuyUrl) void maybeAutofill(valueRef.current.buyUrl);
    return () => {
      requestId.current += 1;
    };
    // Mount-only: share/deep link fills the buy field before the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function maybeAutofill(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      lastFetched.current = '';
      setPreviewHint(null);
      return;
    }
    if (!looksLikeCompleteBuyUrl(trimmed) || trimmed === lastFetched.current) return;

    lastFetched.current = trimmed;
    const id = ++requestId.current;
    setPreviewing(true);
    setPreviewHint(null);
    fallbackRef.current = null;
    setImageFallback(null);
    try {
      const result = await autofillFromBuyUrl(trimmed);
      if (id !== requestId.current) return;
      const patch = applyBuyLinkDraft(valueRef.current, result.draft, lastDraft.current);
      if (patch.title) lastDraft.current.title = patch.title;
      if (patch.notes) lastDraft.current.notes = patch.notes;
      if (patch.imageUrl) lastDraft.current.imageUrl = patch.imageUrl;
      if (patch.imageUrl || !valueRef.current.imageUrl.trim()) {
        fallbackRef.current = result.draft.fallbackImageUrl ?? null;
        setImageFallback(result.draft.fallbackImageUrl ?? null);
      }
      if (Object.keys(patch).length > 0) onChange(patch);
      setPreviewHint(result.message);
    } catch {
      if (id !== requestId.current) return;
      setPreviewHint(BUY_LINK_AUTOFILL_FAIL);
    } finally {
      if (id === requestId.current) setPreviewing(false);
    }
  }

  async function mirrorCurrent() {
    if (mirroring.current) return;
    const page = sanitizeBuyUrl(valueRef.current.buyUrl);
    const image = valueRef.current.imageUrl.trim();
    const fromDraft = image === lastDraft.current.imageUrl || image === fallbackRef.current;
    if (!page || !image || !fromDraft) return;
    if (isWishlistImagesUrl(image)) {
      setPreviewHint(BUY_LINK_AUTOFILL_FAIL);
      return;
    }
    mirroring.current = true;
    try {
      const stored = await mirrorPreviewImage(page, image);
      if (!stored || stored === image) {
        setPreviewHint(BUY_LINK_AUTOFILL_FAIL);
        return;
      }
      if (valueRef.current.imageUrl.trim() === image) {
        lastDraft.current.imageUrl = stored;
        onChange({ imageUrl: stored });
        setPreviewHint(null);
      }
    } finally {
      mirroring.current = false;
    }
  }

  function toggleTag(tag: string) {
    const next = value.tags.includes(tag) ? value.tags.filter((entry) => entry !== tag) : [...value.tags, tag];
    onChange({ tags: next.slice(0, 10) });
  }

  return (
    <>
      <TextField
        label="Buy link (optional)"
        placeholder="https://www.amazon.com.au/…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={value.buyUrl}
        loading={previewing}
        hint={previewHint ?? undefined}
        help={FieldHelp.buyLink}
        onChangeText={(buyUrl) => {
          buyUrlRef.current = buyUrl;
          onChange({ buyUrl });
          if (looksLikeCompleteBuyUrl(buyUrl)) void maybeAutofill(buyUrl);
        }}
        onBlur={() => void maybeAutofill(buyUrlRef.current)}
      />
      {showImageUrl ? (
        <PhotoField
          value={value.imageUrl}
          fallbackUrl={imageFallback}
          referrer={looksLikeCompleteBuyUrl(value.buyUrl) ? value.buyUrl : undefined}
          onChange={(imageUrl) => {
            if (imageUrl.trim()) setPreviewHint(null);
            onChange({ imageUrl });
          }}
          onRemoteError={() => {
            void mirrorCurrent();
          }}
          onBusyChange={onPhotoBusy}
          sharedPhoto={sharedPhoto}
        />
      ) : null}
      <TextField
        label="Title"
        placeholder="The exact thing, or the vibe"
        value={value.title}
        loading={previewing}
        onChangeText={(title) => onChange({ title })}
      />
      <TextField
        label="Notes"
        placeholder="Size, colour, where you saw it"
        multiline
        value={value.notes}
        loading={previewing}
        onChangeText={(notes) => onChange({ notes })}
      />
      <TextField
        label="Size / fit (optional)"
        placeholder="EU 42, crew, 12oz"
        value={value.sizeHint}
        onChangeText={(sizeHint) => onChange({ sizeHint })}
      />
      <TextField
        label="Target amount AUD (optional)"
        keyboardType="decimal-pad"
        placeholder="80"
        value={value.targetAmount}
        onChangeText={(targetAmount) => onChange({ targetAmount })}
        help={FieldHelp.chipIn}
      />

      <View style={{ gap: 8 }}>
        <LabelWithHelp label="Exact item or taste / vibe" help={FieldHelp.exactVsTaste} />
        <FilterChips
          options={[
            { id: 'exact', label: 'Exact item' },
            { id: 'vibe', label: 'Taste / vibe' },
          ]}
          value={value.itemKind}
          onChange={(id) => onChange({ itemKind: id as ItemKind })}
        />
      </View>

      <View style={{ gap: 8 }}>
        <LabelWithHelp label="Vibes" help={FieldHelp.vibe} />
        <VibeChips tags={SUGGESTED_VIBES} selected={value.tags} onToggle={toggleTag} />
        <TextField
          label="More vibes"
          placeholder="quiet luxury, market stall"
          value={value.tags.filter((tag) => !SUGGESTED_VIBES.includes(tag)).join(', ')}
          onChangeText={(text) => {
            const extra = text
              .split(',')
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean);
            const suggested = value.tags.filter((tag) => SUGGESTED_VIBES.includes(tag));
            onChange({ tags: [...suggested, ...extra] });
          }}
        />
      </View>

      {occasions.length > 0 ? (
        <View style={{ gap: 8 }}>
          <ThemedText type="smallBold">Occasion</ThemedText>
          <FilterChips
            options={[{ id: '', label: 'Unassigned' }, ...occasions.map((row) => ({ id: row.id, label: row.title }))]}
            value={value.occasionId ?? ''}
            onChange={(id) => onChange({ occasionId: id || null })}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: '100%' }}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <LabelWithHelp label="No substitutions" help={FieldHelp.noSubs} />
        </View>
        <Switch
          value={value.noSubstitution}
          onValueChange={(noSubstitution) => onChange({ noSubstitution })}
          trackColor={{ true: theme.brand }}
        />
      </View>
    </>
  );
}
