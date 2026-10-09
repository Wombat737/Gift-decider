import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HelpTip } from '@/components/help-tip';
import { NativePressable } from '@/components/native-pressable';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  applyMention,
  commentBodyParts,
  filterTagCandidates,
  mentionIdsForBody,
  mentionQueryAt,
  mentionToken,
  removeCommentThread,
  threadComments,
  unreadMentionCount,
} from '@/lib/giver-social';
import type { CommentTagCandidate, ItemGiverComment } from '@/lib/types';
import {
  deleteItemGiverComment,
  editItemGiverComment,
  listCommentTagCandidates,
  listItemGiverComments,
  markItemGiverCommentMentionsRead,
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
 * The list owner has no RLS path to these rows.
 */
export function GiverComments({ itemId, ownerName, loggedIn, userId, demoGiverPersona }: GiverCommentsProps) {
  const theme = useTheme();
  const [comments, setComments] = useState<ItemGiverComment[]>([]);
  const [candidates, setCandidates] = useState<CommentTagCandidate[]>([]);
  const [body, setBody] = useState('');
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ItemGiverComment | null>(null);
  const pickedIds = useRef<Set<string>>(new Set());
  const markedRead = useRef<string | null>(null);
  const canPost = loggedIn || demoGiverPersona;

  useEffect(() => {
    let cancelled = false;
    markedRead.current = null;
    if (!canPost) {
      setComments([]);
      setCandidates([]);
      return;
    }
    void listItemGiverComments(itemId, { isOwnerRoute: false, loggedIn: canPost })
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load comments');
      });
    void listCommentTagCandidates(itemId, { loggedIn: canPost, demoGiverPersona })
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canPost, demoGiverPersona, itemId]);

  useEffect(() => {
    if (!canPost || markedRead.current === itemId) return;
    if (!comments.some((comment) => comment.unread)) return;
    markedRead.current = itemId;
    void markItemGiverCommentMentionsRead(itemId);
  }, [canPost, comments, itemId]);

  const query = mentionQueryAt(body, cursor);
  const suggestions = query == null ? [] : filterTagCandidates(candidates, query);
  const threads = threadComments(comments);
  const unread = unreadMentionCount(comments);
  const who = ownerName.trim() || 'them';

  function resetComposer() {
    setBody('');
    setCursor(0);
    setEditingId(null);
    setReplyTo(null);
    pickedIds.current = new Set();
  }

  function onChangeBody(text: string) {
    setBody(text);
    setCursor((current) => {
      if (text.length >= body.length && text.startsWith(body)) return text.length;
      return Math.min(current, text.length);
    });
  }

  function onPickTag(person: CommentTagCandidate) {
    const token = mentionToken(person);
    if (!token) return;
    const next = applyMention(body, cursor, token);
    pickedIds.current.add(person.id);
    setBody(next.body);
    setCursor(next.cursor);
  }

  async function onPost() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const mentionIds = mentionIdsForBody(body, candidates, [...pickedIds.current]);
      const posted = await postItemGiverComment(itemId, body, {
        demoGiverPersona,
        parentId: replyTo?.id ?? null,
        mentionIds,
      });
      setComments((current) => [...current, posted.comment]);
      if (posted.postedWithoutThread) {
        setNotice('Posted as a comment. Replies sync after the comments update is applied.');
      } else if (posted.mentionsDeferred) {
        setNotice('Saved. @tags light up here; unread pings start after the comments update is applied.');
      }
      resetComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(comment: ItemGiverComment) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const mentionIds = mentionIdsForBody(body, candidates, [...pickedIds.current]);
      const row = await editItemGiverComment(comment.id, body, mentionIds);
      setComments((current) => current.map((entry) => (entry.id === row.id ? row : entry)));
      resetComposer();
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
      setComments((current) => removeCommentThread(current, commentId));
      if (editingId === commentId || replyTo?.id === commentId) resetComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <ThemedText type="eyebrow" themeColor="brand">
          Comments
        </ThemedText>
        {unread > 0 ? (
          <View
            style={[styles.unreadBadge, { backgroundColor: theme.brand }]}
            accessibilityLabel={`${unread} new ${unread === 1 ? 'mention' : 'mentions'}`}>
            <ThemedText type="caption" style={{ color: theme.brandText }}>
              {unread}
            </ThemedText>
          </View>
        ) : null}
        <HelpTip title="Comments" body={`Only other givers see this — not ${who}.`} />
      </View>

      {!canPost ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Sign in to leave a comment for other givers. You can still reserve from this link.
          </ThemedText>
          <Button label="Sign in to comment" variant="secondary" onPress={() => router.push('/sign-in')} />
        </>
      ) : (
        <>
          {threads.map((thread) => (
            <View key={thread.comment.id} style={styles.thread}>
              <CommentRow
                comment={thread.comment}
                userId={userId}
                busy={busy}
                onReply={() => {
                  setReplyTo(thread.comment);
                  setEditingId(null);
                  setBody('');
                  pickedIds.current = new Set();
                }}
                onEdit={() => {
                  setEditingId(thread.comment.id);
                  setReplyTo(null);
                  setBody(thread.comment.body);
                  setCursor(thread.comment.body.length);
                  pickedIds.current = new Set(thread.comment.mentions.map((mention) => mention.user_id));
                }}
                onDelete={() => void onDelete(thread.comment.id)}
              />
              {thread.replies.map((reply) => (
                <View key={reply.id} style={[styles.reply, { borderLeftColor: theme.border }]}>
                  <CommentRow
                    comment={reply}
                    userId={userId}
                    busy={busy}
                    onEdit={() => {
                      setEditingId(reply.id);
                      setReplyTo(null);
                      setBody(reply.body);
                      setCursor(reply.body.length);
                      pickedIds.current = new Set(reply.mentions.map((mention) => mention.user_id));
                    }}
                    onDelete={() => void onDelete(reply.id)}
                  />
                </View>
              ))}
            </View>
          ))}

          {replyTo ? (
            <View style={styles.replying}>
              <ThemedText type="small" themeColor="textSecondary">
                Replying to {replyTo.author_display_name}
              </ThemedText>
              <NativePressable
                accessibilityRole="button"
                accessibilityLabel="Cancel reply"
                onPress={() => setReplyTo(null)}
                style={styles.textBtn}>
                <ThemedText type="smallBold" themeColor="brand">
                  Cancel
                </ThemedText>
              </NativePressable>
            </View>
          ) : null}

          <TextField
            label={editingId ? 'Edit comment' : replyTo ? 'Reply' : 'Add a comment'}
            value={body}
            onChangeText={onChangeBody}
            onSelectionChange={(event) => {
              setCursor(event.nativeEvent.selection.end);
            }}
            placeholder={replyTo ? 'Reply to the other givers…' : 'Size, colour, I’ll grab this… @alex'}
            multiline
          />

          {suggestions.length > 0 ? (
            <View style={[styles.suggest, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {suggestions.map((person) => {
                const token = mentionToken(person);
                const label = person.display_name || (token ? `@${token}` : 'Giver');
                return (
                  <NativePressable
                    key={person.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Tag ${label}`}
                    onPress={() => onPickTag(person)}
                    style={styles.suggestRow}>
                    <ThemedText type="smallBold">{label}</ThemedText>
                    {token ? (
                      <ThemedText type="small" themeColor="brand">
                        @{token}
                      </ThemedText>
                    ) : null}
                  </NativePressable>
                );
              })}
            </View>
          ) : null}

          {notice ? (
            <ThemedText type="small" themeColor="textSecondary">
              {notice}
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText type="small" themeColor="accent">
              {error}
            </ThemedText>
          ) : null}
          {editingId ? (
            <View style={styles.stack}>
              <Button
                label={busy ? 'Saving…' : 'Save comment'}
                disabled={busy}
                onPress={() => {
                  const current = comments.find((row) => row.id === editingId);
                  if (current) void onSaveEdit(current);
                }}
              />
              <Button label="Cancel" variant="ghost" onPress={resetComposer} />
            </View>
          ) : (
            <Button
              label={busy ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
              disabled={busy || !body.trim()}
              onPress={() => void onPost()}
            />
          )}
        </>
      )}
    </Card>
  );
}

function CommentRow({
  comment,
  userId,
  busy,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: ItemGiverComment;
  userId?: string | null;
  busy: boolean;
  onReply?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const parts = commentBodyParts(comment.body);
  const mine = Boolean(userId && comment.author_id === userId);

  return (
    <View
      style={[
        styles.comment,
        comment.unread && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
      ]}
      accessibilityLabel={comment.unread ? 'New mention' : undefined}>
      <View style={styles.authorRow}>
        {comment.unread ? (
          <View style={[styles.dot, { backgroundColor: theme.brand }]} accessibilityLabel="Unread" />
        ) : null}
        <ThemedText type="smallBold">{comment.author_display_name}</ThemedText>
        {comment.unread ? (
          <ThemedText type="caption" themeColor="accent">
            New
          </ThemedText>
        ) : null}
      </View>
      <ThemedText>
        {parts.map((part, index) =>
          part.kind === 'tag' ? (
            <ThemedText
              key={`${comment.id}-${index}`}
              type="bodyEm"
              themeColor="brand"
              style={[styles.tag, { backgroundColor: theme.brandSoft }]}>
              {part.text}
            </ThemedText>
          ) : (
            part.text
          ),
        )}
      </ThemedText>
      {comment.edited_at ? (
        <ThemedText type="caption" themeColor="textSecondary">
          Edited
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        {onReply ? (
          <NativePressable accessibilityRole="button" accessibilityLabel="Reply" onPress={onReply} style={styles.textBtn}>
            <ThemedText type="smallBold" themeColor="brand">
              Reply
            </ThemedText>
          </NativePressable>
        ) : null}
        {mine ? (
          <>
            <NativePressable accessibilityRole="button" accessibilityLabel="Edit comment" onPress={onEdit} style={styles.textBtn}>
              <ThemedText type="smallBold">Edit</ThemedText>
            </NativePressable>
            <NativePressable
              accessibilityRole="button"
              accessibilityLabel="Delete comment"
              disabled={busy}
              onPress={onDelete}
              style={styles.textBtn}>
              <ThemedText type="smallBold">Delete</ThemedText>
            </NativePressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.two,
    maxWidth: '100%',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  comment: {
    gap: Spacing.one,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: Spacing.two,
  },
  reply: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    paddingLeft: Spacing.three,
    borderLeftWidth: 2,
  },
  stack: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    maxWidth: '100%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  tag: {
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
  },
  textBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  replying: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
  },
  suggest: {
    width: '100%',
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: Radius.button,
    overflow: 'hidden',
  },
  suggestRow: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    maxWidth: '100%',
  },
});
