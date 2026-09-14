import { useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { formatAud, parseAud } from '@/lib/format';
import { isFunded, pledgeRemaining, pledgeTotal } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

type PledgePanelProps = {
  item: WishlistItem;
  busy?: boolean;
  demo?: boolean;
  onToggleGroup: (enabled: boolean) => void;
  onPledge: (amount: number, name?: string) => Promise<void>;
  onMarkFunded: () => void;
  onSimulateFunded?: () => void;
};

export function PledgePanel({
  item,
  busy,
  demo,
  onToggleGroup,
  onPledge,
  onMarkFunded,
  onSimulateFunded,
}: PledgePanelProps) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const total = pledgeTotal(item);
  const remaining = pledgeRemaining(item);
  const funded = isFunded(item);

  async function submit() {
    setError(null);
    const parsed = parseAud(amount);
    if (parsed == null || parsed <= 0) {
      setError('Enter an amount in AUD');
      return;
    }
    try {
      await onPledge(parsed, name.trim() || undefined);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save pledge');
    }
  }

  return (
    <Card>
      <ThemedText type="eyebrow" themeColor="accent">
        Givers only
      </ThemedText>
      <ThemedText type="smallBold">Group gift · honour system</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Chip-in is giver-only until funded. Then they see who it’s from — not the dollar amounts.
        Honour system, no Stripe.
      </ThemedText>

      {item.is_group_gift ? (
        <>
          <ThemedText>
            {formatAud(total)}
            {item.target_amount ? ` of ${formatAud(item.target_amount)}` : ''} chipped in
            {funded ? ' · Funded' : remaining != null ? ` · ${formatAud(remaining)} to go` : ''}
          </ThemedText>
          {(item.pledges ?? []).map((pledge) => (
            <ThemedText key={pledge.id} type="small" themeColor="textSecondary">
              {formatAud(pledge.amount)}
              {pledge.display_name ? ` · ${pledge.display_name}` : ' · a giver'}
            </ThemedText>
          ))}
          <TextField
            label="Chip in (AUD)"
            keyboardType="decimal-pad"
            placeholder="40"
            value={amount}
            onChangeText={setAmount}
          />
          <TextField
            label="Name on the pledge (optional, givers only)"
            placeholder="Leave blank to stay unnamed"
            value={name}
            onChangeText={setName}
          />
          <Button label={busy ? 'Saving…' : 'I’ve chipped in'} disabled={busy} onPress={() => void submit()} />
          {funded ? (
            <ThemedText type="small" themeColor="success">
              Funded — the recipient can now see who it’s from.
            </ThemedText>
          ) : (
            <Button label="Mark funded" variant="secondary" disabled={busy} onPress={onMarkFunded} />
          )}
          {demo && !funded && onSimulateFunded ? (
            <Button
              label="Simulate funded (demo)"
              variant="ghost"
              disabled={busy}
              accessibilityLabel="simulate-funded-demo"
              onPress={onSimulateFunded}
            />
          ) : null}
          <Button label="Not a group gift" variant="ghost" disabled={busy} onPress={() => onToggleGroup(false)} />
        </>
      ) : (
        <Button
          label="Mark as a group gift"
          variant="secondary"
          disabled={busy}
          onPress={() => onToggleGroup(true)}
        />
      )}

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
    </Card>
  );
}
