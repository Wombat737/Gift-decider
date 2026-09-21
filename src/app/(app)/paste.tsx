import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { Button } from '@/components/button';
import { FlowHeader } from '@/components/flow-header';
import { PhotoField } from '@/components/photo-field';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { FieldHelp } from '@/lib/help';
import { applyBuyLinkDraft, draftFromPreview, looksLikeCompleteBuyUrl, previewMissMessage, type BuyLinkFields } from '@/lib/link-preview';
import { mirrorPreviewImage, previewUrl } from '@/services/preview';

const PASTE_MISS = 'Couldn’t grab that post — add a title and photo';

export default function PasteInstagramScreen() {
  const { addItem } = useWishlist();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [lastDraft, setLastDraft] = useState<BuyLinkFields>({ title: '', notes: '', imageUrl: '' });
  const [imageFallback, setImageFallback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  async function onPreview(raw = url) {
    const id = ++request.current;
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const preview = await previewUrl(raw);
      if (id !== request.current) return;
      const draft = draftFromPreview(preview);
      const patch = applyBuyLinkDraft({ title, notes, imageUrl }, draft, lastDraft);
      if (patch.title) setTitle(patch.title);
      if (patch.notes) setNotes(patch.notes);
      if (patch.imageUrl) setImageUrl(patch.imageUrl);
      setImageFallback(draft.fallbackImageUrl ?? null);
      setLastDraft({
        title: patch.title ?? lastDraft.title,
        notes: patch.notes ?? lastDraft.notes,
        imageUrl: patch.imageUrl ?? lastDraft.imageUrl,
      });
      setHint(previewMissMessage(draft, true) ?? (draft.imageUrl ? null : PASTE_MISS));
    } catch (err) {
      if (id !== request.current) return;
      setHint(PASTE_MISS);
      if (err instanceof Error && err.message === 'Paste a URL first') {
        setError(err.message);
      }
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  async function onPin() {
    setBusy(true);
    setError(null);
    try {
      const item = await addItem({
        title: title.trim() || 'Instagram find',
        notes: notes.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        source_type: 'instagram',
        source_url: url.trim() || undefined,
      });
      router.replace(`/item/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pin item');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <FlowHeader title="Paste a public post" />

      <TextField
        label="Public Instagram URL"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://www.instagram.com/p/…"
        value={url}
        loading={busy}
        hint={hint ?? undefined}
        help={FieldHelp.instagram}
        onChangeText={(next) => {
          setUrl(next);
          if (looksLikeCompleteBuyUrl(next)) void onPreview(next);
        }}
        onBlur={() => {
          if (looksLikeCompleteBuyUrl(url)) void onPreview(url);
        }}
      />

      <Button label={busy ? 'Working…' : 'Preview'} disabled={busy || photoBusy} onPress={() => void onPreview()} />

      <TextField
        label="Title"
        placeholder="The exact thing, or the vibe"
        value={title}
        loading={busy}
        onChangeText={setTitle}
      />
      <PhotoField
        value={imageUrl}
        fallbackUrl={imageFallback}
        referrer={looksLikeCompleteBuyUrl(url) ? url : undefined}
        onChange={setImageUrl}
        onBusyChange={setPhotoBusy}
        onRemoteError={() => {
          if (!looksLikeCompleteBuyUrl(url) || !imageUrl.trim()) return;
          void mirrorPreviewImage(url, imageUrl).then((stored) => {
            if (stored && stored !== imageUrl) setImageUrl(stored);
          });
        }}
      />
      <TextField
        label="Notes"
        placeholder="Size, colour, where you saw it"
        multiline
        value={notes}
        loading={busy}
        onChangeText={setNotes}
      />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      <Button label="Pin as wishlist item" onPress={() => void onPin()} disabled={busy || photoBusy} />
    </Screen>
  );
}
