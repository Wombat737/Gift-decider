import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateField } from '@/components/date-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FilterChips } from '@/components/vibe-chips';
import { formatAud, parseAud } from '@/lib/format';
import {
  asDeliveryMethod,
  asRevealDate,
  deliveryMethodLabel,
  formatRevealDate,
  groupGiftPhase,
  groupGiftPhaseLabel,
  isFunded,
  isRevealDue,
  pickOrganiserName,
  pledgeRemaining,
  pledgeTotal,
  shiftLocalDate,
} from '@/lib/pledges';
import type { DeliveryMethod, WishlistItem } from '@/lib/types';

type PledgePanelProps = {
  item: WishlistItem;
  busy?: boolean;
  demo?: boolean;
  defaultOrganiserName?: string;
  onToggleGroup: (
    enabled: boolean,
    revealAt?: string | null,
    organiserName?: string | null,
    payInstructions?: string | null,
  ) => void;
  onSetRevealAt: (revealAt: string) => void;
  onSetOrganiser: (name: string) => void;
  onSetPayInstructions: (value: string) => void;
  onSetDelivery: (method: DeliveryMethod, note?: string | null) => void;
  onPledge: (amount: number, name?: string) => Promise<void>;
  onMarkFunded: () => void;
  onMarkPurchased: () => void;
  onSimulateFunded?: () => void;
  onSimulateReveal?: (which: 'today' | 'yesterday') => void;
};

export function PledgePanel({
  item,
  busy,
  demo,
  defaultOrganiserName,
  onToggleGroup,
  onSetRevealAt,
  onSetOrganiser,
  onSetPayInstructions,
  onSetDelivery,
  onPledge,
  onMarkFunded,
  onMarkPurchased,
  onSimulateFunded,
  onSimulateReveal,
}: PledgePanelProps) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftDate, setDraftDate] = useState(shiftLocalDate(1));
  const [draftOrganiser, setDraftOrganiser] = useState(defaultOrganiserName ?? '');
  const [draftPay, setDraftPay] = useState('');
  const [editDate, setEditDate] = useState(item.reveal_at ?? shiftLocalDate(1));
  const [organiserDraft, setOrganiserDraft] = useState(item.organiser_name ?? '');
  const [payDraft, setPayDraft] = useState(item.pay_instructions ?? '');
  const [deliveryNote, setDeliveryNote] = useState(item.delivery_note ?? '');
  const total = pledgeTotal(item);
  const remaining = pledgeRemaining(item);
  const funded = isFunded(item);
  const revealed = isRevealDue(item);
  const phase = groupGiftPhase(item);
  const revealLabel = formatRevealDate(item.reveal_at);
  const organiser = pickOrganiserName(item);
  const readyNotice = (item.notices ?? []).find((row) => row.kind === 'ready_to_buy');
  const pledgeNames = [...new Set((item.pledges ?? []).map((row) => row.display_name?.trim()).filter(Boolean))] as string[];

  useEffect(() => {
    if (item.reveal_at) setEditDate(item.reveal_at);
    setOrganiserDraft(item.organiser_name ?? '');
    setPayDraft(item.pay_instructions ?? '');
    setDeliveryNote(item.delivery_note ?? '');
  }, [item.reveal_at, item.organiser_name, item.pay_instructions, item.delivery_note]);

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
    onToggleGroup(true, date, draftOrganiser.trim() || defaultOrganiserName || null, draftPay.trim() || null);
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
        Chip-in progress stays between givers. The organiser buys. Pay them via PayID / BSB — Gift Decider
        holds no money. The recipient sees who chipped in on the reveal date, not when it’s funded.
      </ThemedText>

      {item.is_group_gift ? (
        <>
          <ThemedText type="smallBold" themeColor="success">
            {groupGiftPhaseLabel(phase)}
            {phase === 'ready_to_buy' ? ' — organiser should purchase' : ''}
          </ThemedText>
          {funded && item.status !== 'purchased' ? (
            <Card accessibilityLabel="organiser-ready-to-buy">
              <ThemedText type="eyebrow" themeColor="success">
                Funded — time to buy
              </ThemedText>
              <ThemedText type="smallBold">
                {organiser} is the organiser. Buy it, then mark purchased and pick delivery.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                They still won’t see who chipped in until {revealLabel}. Push notifications are next —
                this in-app banner is the alert for now.
              </ThemedText>
              {readyNotice?.email_preview ? (
                <ThemedText type="small" themeColor="textSecondary" accessibilityLabel="ready-to-buy-email-stub">
                  Email stub (no key required): {readyNotice.email_preview.split('\n')[0]}
                </ThemedText>
              ) : null}
            </Card>
          ) : null}
          <ThemedText>
            {formatAud(total)}
            {item.target_amount ? ` of ${formatAud(item.target_amount)}` : ''} chipped in
            {funded ? ' · Funded' : remaining != null ? ` · ${formatAud(remaining)} to go` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Organiser: {organiser}. Reveal to them on {revealLabel}
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
          <TextField
            label="How to pay the organiser (PayID / BSB)"
            placeholder="PayID: alex@chipin.au"
            value={payDraft}
            onChangeText={setPayDraft}
            hint="Visible to givers only. Honour system — no Stripe, no money in the app."
          />
          <Button
            label="Save pay instructions"
            variant="secondary"
            disabled={busy}
            onPress={() => onSetPayInstructions(payDraft)}
          />
          <TextField
            label="Organiser (who buys)"
            placeholder="Alex"
            value={organiserDraft}
            onChangeText={setOrganiserDraft}
            hint="Default: who marked it a group gift, else the first named pledge. Hand off to another giver below."
          />
          {pledgeNames.length > 0 ? (
            <FilterChips
              options={pledgeNames.map((entry) => ({ id: entry, label: entry }))}
              value={organiserDraft}
              onChange={(id) => setOrganiserDraft(id)}
            />
          ) : null}
          <Button
            label="Save organiser"
            variant="secondary"
            disabled={busy}
            onPress={() => {
              if (!organiserDraft.trim()) {
                setError('Name the organiser');
                return;
              }
              setError(null);
              onSetOrganiser(organiserDraft.trim());
            }}
          />
          {funded ? (
            <>
              <ThemedText type="smallBold">Delivery (organiser)</ThemedText>
              <FilterChips
                options={[
                  { id: 'to_organiser', label: 'To organiser' },
                  { id: 'collect', label: 'Collect' },
                  { id: 'other', label: 'Other' },
                ]}
                value={item.delivery_method ?? ''}
                onChange={(id) => {
                  const method = asDeliveryMethod(id);
                  if (method) onSetDelivery(method, deliveryNote);
                }}
              />
              <TextField
                label="Delivery note (optional)"
                placeholder="Leave with Sam / wrap it"
                value={deliveryNote}
                onChangeText={setDeliveryNote}
              />
              {item.delivery_method ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {deliveryMethodLabel(item.delivery_method)}
                  {item.delivery_note ? ` · ${item.delivery_note}` : ''}
                </ThemedText>
              ) : null}
              {item.status !== 'purchased' ? (
                <Button
                  label="Mark purchased"
                  disabled={busy}
                  accessibilityLabel="organiser-mark-purchased"
                  onPress={onMarkPurchased}
                />
              ) : (
                <ThemedText type="small" themeColor="success">
                  Purchased. They still only see who chipped in on {revealLabel}.
                </ThemedText>
              )}
            </>
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
          <TextField
            label="You’re the organiser (who buys)"
            placeholder="Alex"
            value={draftOrganiser}
            onChangeText={setDraftOrganiser}
            hint="Default: you, or the first named pledge. You can hand off later."
          />
          <TextField
            label="How givers pay you (PayID / BSB)"
            placeholder="PayID: you@bank.au"
            value={draftPay}
            onChangeText={setDraftPay}
            hint="Honour system. The app tracks pledges only."
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
            setDraftOrganiser(defaultOrganiserName ?? '');
            setDraftPay('');
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
