import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ItemGiverComment } from '@/lib/types';
import {
  deleteItemGiverComment,
  editItemGiverComment,
  listItemGiverComments,
  postItemGiverComment,
} from '@/services/giver-social';

type GiverCommentsProps = {
  itemId: string;
  ownerName: string;
  loggedIn: boolean;
  userId?: string | null;
  demoGiverPersona: boolean;
};

/**
 * Giver item detail only. Never import from owner `/item/[id]`.
 * Anon share-token givers can still reserve; posting needs a logged-in giver.
 */
export function GiverComments({ itemId, ownerName, loggedIn, userId, demoGiverPersona }: GiverCommentsProps) {
  const [comments, setComments] = useState<ItemGiverComment[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!loggedIn && !demoGiverPersona) {
      setComments([]);
      return;
    }
    void listItemGiverComments(itemId, { isOwnerRoute: false, loggedIn: loggedIn || demoGiverPersona })
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load notes');
      });
    return () => {
      cancelled = true;
    };
  }, [demoGiverPersona, itemId, loggedIn]);

  async function onPost() {
    setBusy(true);
    setError(null);
    try {
      const row = await postItemGiverComment(itemId, body, { demoGiverPersona });
      setComments((current) => [...current, row]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(comment: ItemGiverComment) {
    setBusy(true);
    setError(null);
    try {
      const row = await editItemGiverComment(comment.id, body);
      setComments((current) => current.map((entry) => (entry.id === row.id ? row : entry)));
      setEditingId(null);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not edit');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(commentId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteItemGiverComment(commentId);
      setComments((current) => current.filter((entry) => entry.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  }

  const who = ownerName.trim() || 'them';

  return (
    <Card>
      <ThemedText type="eyebrow" themeColor="brand">
        Giver notes
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Only other givers see this — not {who}.
      </ThemedText>

      {!loggedIn && !demoGiverPersona ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Sign in to leave a note for other givers. You can still reserve from this link.
          </ThemedText>
          <Button label="Sign in to comment" variant="secondary" onPress={() => router.push('/sign-in')} />
        </>
      ) : (
        <>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.thread}>
              <ThemedText type="smallBold">{comment.author_display_name}</ThemedText>
              <ThemedText>{comment.body}</ThemedText>
              {comment.edited_at ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  Edited
                </ThemedText>
              ) : null}
              {userId && comment.author_id === userId ? (
                <View style={styles.row}>
                  <Button
                    label="Edit"
                    variant="ghost"
                    onPress={() => {
                      setEditingId(comment.id);
                      setBody(comment.body);
                    }}
                  />
                  <Button label="Delete" variant="ghost" disabled={busy} onPress={() => void onDelete(comment.id)} />
                </View>
              ) : null}
            </View>
          ))}

          <TextField
            label={editingId ? 'Edit note' : 'Add a note'}
            value={body}
            onChangeText={setBody}
            placeholder="Size, colour, I’ll grab this…"
            multiline
          />
          {error ? (
            <ThemedText type="small" themeColor="accent">
              {error}
            </ThemedText>
          ) : null}
          {editingId ? (
            <View style={styles.row}>
              <Button
                label={busy ? 'Saving…' : 'Save note'}
                disabled={busy}
                onPress={() => {
                  const current = comments.find((row) => row.id === editingId);
                  if (current) void onSaveEdit(current);
                }}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setEditingId(null);
                  setBody('');
                }}
              />
            </View>
          ) : (
            <Button label={busy ? 'Posting…' : 'Post note'} disabled={busy || !body.trim()} onPress={() => void onPost()} />
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: Spacing.one,
    width: '100%',
  },
  row: {
    gap: Spacing.two,
    width: '100%',
  },
});
