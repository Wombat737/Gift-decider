import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateField } from '@/components/date-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { formatAud, parseAud } from '@/lib/format';
import {
  asRevealDate,
  formatRevealDate,
  isFunded,
  isRevealDue,
  pledgeRemaining,
  pledgeTotal,
  shiftLocalDate,
} from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

type PledgePanelProps = {
  item: WishlistItem;
  busy?: boolean;
  demo?: boolean;
  onToggleGroup: (enabled: boolean, revealAt?: string | null) => void;
  onSetRevealAt: (revealAt: string) => void;
  onPledge: (amount: number, name?: string) => Promise<void>;
  onMarkFunded: () => void;
  onSimulateFunded?: () => void;
  onSimulateReveal?: (which: 'today' | 'yesterday') => void;
};

export function PledgePanel({
  item,
  busy,
  demo,
  onToggleGroup,
  onSetRevealAt,
  onPledge,
  onMarkFunded,
  onSimulateFunded,
  onSimulateReveal,
}: PledgePanelProps) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftDate, setDraftDate] = useState(shiftLocalDate(1));
  const [editDate, setEditDate] = useState(item.reveal_at ?? shiftLocalDate(1));
  const total = pledgeTotal(item);
  const remaining = pledgeRemaining(item);
  const funded = isFunded(item);
  const revealed = isRevealDue(item);
  const revealLabel = formatRevealDate(item.reveal_at);

  useEffect(() => {
    if (item.reveal_at) setEditDate(item.reveal_at);
  }, [item.reveal_at]);

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

  function confirmGroupGift() {
    const date = asRevealDate(draftDate);
    if (!date) {
      setError('Pick a reveal date');
      return;
    }
    setError(null);
    setDrafting(false);
    setEditDate(date);
    onToggleGroup(true, date);
  }

  function saveRevealDate() {
    const date = asRevealDate(editDate);
    if (!date) {
      setError('Pick a reveal date');
      return;
    }
    setError(null);
    onSetRevealAt(date);
  }

  return (
    <Card>
      <ThemedText type="eyebrow" themeColor="accent">
        Givers only
      </ThemedText>
      <ThemedText type="smallBold">Group gift · honour system</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Chip-in progress stays between givers. The recipient sees who chipped in on the reveal date
        you pick — not as soon as it’s funded. Honour system, no Stripe.
      </ThemedText>

      {item.is_group_gift ? (
        <>
          <ThemedText>
            {formatAud(total)}
            {item.target_amount ? ` of ${formatAud(item.target_amount)}` : ''} chipped in
            {funded ? ' · Funded' : remaining != null ? ` · ${formatAud(remaining)} to go` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Reveal to them on {revealLabel}
            {revealed ? ' (that date has arrived).' : ' — they stay unspoiled until then.'}
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
              {revealed
                ? 'Funded, and the reveal date has arrived — they can see who it’s from.'
                : `Funded among givers. They still won’t see who it’s from until ${revealLabel}.`}
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
          <DateField
            label="Reveal date"
            value={editDate}
            onChange={setEditDate}
            hint="If you’re giving it on Saturday, pick Sunday so they see who chipped in the day after."
            accessibilityLabel="group-gift-reveal-date"
          />
          <Button label="Save reveal date" variant="secondary" disabled={busy} onPress={saveRevealDate} />
          {demo && onSimulateReveal ? (
            <>
              <Button
                label="Simulate reveal date = today"
                variant="ghost"
                disabled={busy}
                accessibilityLabel="simulate-reveal-today"
                onPress={() => onSimulateReveal('today')}
              />
              <Button
                label="Simulate reveal date = yesterday"
                variant="ghost"
                disabled={busy}
                accessibilityLabel="simulate-reveal-yesterday"
                onPress={() => onSimulateReveal('yesterday')}
              />
            </>
          ) : null}
          <Button label="Not a group gift" variant="ghost" disabled={busy} onPress={() => onToggleGroup(false)} />
        </>
      ) : drafting ? (
        <>
          <DateField
            label="When should they see who chipped in?"
            value={draftDate}
            onChange={setDraftDate}
            hint="Pick the day after you give the gift so they stay surprised until then."
            accessibilityLabel="group-gift-reveal-date"
          />
          <Button label="Save as a group gift" disabled={busy} onPress={confirmGroupGift} />
          <Button
            label="Cancel"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setDrafting(false);
              setError(null);
            }}
          />
        </>
      ) : (
        <Button
          label="Mark as a group gift"
          variant="secondary"
          disabled={busy}
          onPress={() => {
            setDraftDate(shiftLocalDate(1));
            setDrafting(true);
            setError(null);
          }}
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
