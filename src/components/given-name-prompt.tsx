import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { PrettyCopy } from '@/lib/copy';
import { firstNameFromEmail, givenNameToSave, needsGivenNamePrompt, notifyGivenNameSaved } from '@/lib/given-name';
import { getOwnProfile, updateOwnProfile } from '@/services/profile';

/** Inline ask on home until profiles.display_name has a real first name. */
export function GivenNamePrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) {
      setOpen(false);
      return;
    }
    void getOwnProfile()
      .then((profile) => {
        const ask = needsGivenNamePrompt(profile?.display_name);
        setOpen(ask);
        if (ask) {
          setName((current) => current || (firstNameFromEmail(user.email) ?? ''));
        }
      })
      .catch(() => {
        setOpen(false);
      });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!open) return null;

  async function onSave() {
    const next = givenNameToSave(name);
    if (!next) {
      setError('Use a first name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateOwnProfile({ display_name: next });
      notifyGivenNameSaved();
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your name');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="titleSm">{PrettyCopy.givenNamePrompt}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {PrettyCopy.givenNameBody}
        </ThemedText>
        <TextField
          label="First name"
          value={name}
          onChangeText={setName}
          placeholder="Wade"
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Button
          label={saving ? 'Saving…' : PrettyCopy.givenNameSave}
          disabled={saving || !name.trim()}
          onPress={() => void onSave()}
        />
        {error ? (
          <ThemedText type="small" themeColor="accent">
            {error}
          </ThemedText>
        ) : null}
      </View>
    </Card>
  );
}
