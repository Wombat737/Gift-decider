import { Switch, View } from 'react-native';

import { LabelWithHelp } from '@/components/help-tip';
import { FilterChips, SUGGESTED_VIBES, VibeChips } from '@/components/vibe-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FieldHelp } from '@/lib/help';
import { useTheme } from '@/hooks/use-theme';
import type { ItemKind, Occasion } from '@/lib/types';

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
};

export function ItemFields({ value, occasions, onChange, showImageUrl = true }: ItemFieldsProps) {
  const theme = useTheme();

  function toggleTag(tag: string) {
    const next = value.tags.includes(tag) ? value.tags.filter((entry) => entry !== tag) : [...value.tags, tag];
    onChange({ tags: next.slice(0, 10) });
  }

  return (
    <>
      <TextField label="Title" placeholder="The exact thing, or the vibe" value={value.title} onChangeText={(title) => onChange({ title })} />
      {showImageUrl ? (
        <TextField
          label="Photo URL"
          placeholder="https://…"
          autoCapitalize="none"
          value={value.imageUrl}
          onChangeText={(imageUrl) => onChange({ imageUrl })}
        />
      ) : null}
      <TextField
        label="Notes"
        placeholder="Size, colour, where you saw it"
        multiline
        value={value.notes}
        onChangeText={(notes) => onChange({ notes })}
      />
      <TextField
        label="Size / fit (optional)"
        placeholder="EU 42, crew, 12oz"
        value={value.sizeHint}
        onChangeText={(sizeHint) => onChange({ sizeHint })}
      />
      <TextField
        label="Buy URL (optional)"
        placeholder="https://…"
        autoCapitalize="none"
        value={value.buyUrl}
        onChangeText={(buyUrl) => onChange({ buyUrl })}
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
