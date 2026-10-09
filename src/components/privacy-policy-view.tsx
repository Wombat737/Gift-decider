import * as Linking from 'expo-linking';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { privacyPolicyMarkdown } from '@/content/privacy-policy';
import { useTheme } from '@/hooks/use-theme';

type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'link'; text: string; url: string };

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

function splitInline(value: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of value.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: 'text', text: value.slice(last, index) });
    const token = match[0];
    if (token.startsWith('**')) parts.push({ kind: 'bold', text: token.slice(2, -2) });
    else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) parts.push({ kind: 'link', text: link[1], url: link[2] });
      else parts.push({ kind: 'text', text: token });
    } else parts.push({ kind: 'em', text: token.slice(1, -1) });
    last = index + token.length;
  }
  if (last < value.length) parts.push({ kind: 'text', text: value.slice(last) });
  return parts.length > 0 ? parts : [{ kind: 'text', text: value }];
}

function InlineText({ value, muted = false }: { value: string; muted?: boolean }) {
  const theme = useTheme();
  return (
    <ThemedText type="small" themeColor={muted ? 'textSecondary' : undefined}>
      {splitInline(value).map((part, index) => {
        if (part.kind === 'bold') {
          return (
            <ThemedText key={index} type="smallBold" themeColor={muted ? 'textSecondary' : undefined}>
              {part.text}
            </ThemedText>
          );
        }
        if (part.kind === 'em') {
          return (
            <ThemedText key={index} type="small" style={styles.em} themeColor={muted ? 'textSecondary' : undefined}>
              {part.text}
            </ThemedText>
          );
        }
        if (part.kind === 'link') {
          return (
            <ThemedText
              key={index}
              type="small"
              style={{ color: theme.brandInk }}
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(part.url);
              }}>
              {part.text}
            </ThemedText>
          );
        }
        return <Fragment key={index}>{part.text}</Fragment>;
      })}
    </ThemedText>
  );
}

type Block =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }
  | { kind: 'rule' };

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '---') {
      blocks.push({ kind: 'rule' });
      continue;
    }
    if (line.startsWith('### ')) blocks.push({ kind: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ kind: 'h2', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ kind: 'h1', text: line.slice(2) });
    else if (line.startsWith('- ')) blocks.push({ kind: 'li', text: line.slice(2) });
    else blocks.push({ kind: 'p', text: line });
  }
  return blocks;
}

/** Renders the drafted privacy policy, including TODO placeholders. */
export function PrivacyPolicyView() {
  const theme = useTheme();
  const blocks = parseBlocks(privacyPolicyMarkdown);
  const sections: Block[][] = [];
  let current: Block[] = [];

  for (const block of blocks) {
    if (block.kind === 'h2' && current.length > 0) {
      sections.push(current);
      current = [block];
    } else {
      current.push(block);
    }
  }
  if (current.length > 0) sections.push(current);

  return (
    <View style={styles.wrap}>
      {sections.map((section, index) => {
        const lead = section[0];
        if (lead?.kind === 'h1' || (lead?.kind === 'p' && index === 0)) {
          return (
            <View key={index} style={styles.intro}>
              {section.map((block, blockIndex) => (
                <BlockView key={blockIndex} block={block} />
              ))}
            </View>
          );
        }
        return (
          <Card key={index}>
            {section.map((block, blockIndex) => (
              <BlockView key={blockIndex} block={block} ruleColor={theme.border} />
            ))}
          </Card>
        );
      })}
    </View>
  );
}

function BlockView({ block, ruleColor }: { block: Block; ruleColor?: string }) {
  if (block.kind === 'h1') return <ThemedText type="title">{block.text}</ThemedText>;
  if (block.kind === 'h2') return <ThemedText type="heading">{block.text}</ThemedText>;
  if (block.kind === 'h3') return <ThemedText type="smallBold">{block.text}</ThemedText>;
  if (block.kind === 'rule') {
    if (!ruleColor) return null;
    return <View style={[styles.rule, { backgroundColor: ruleColor }]} />;
  }
  if (block.kind === 'li') {
    return (
      <View style={styles.bullet}>
        <ThemedText type="small" themeColor="textSecondary">
          •
        </ThemedText>
        <View style={styles.bulletBody}>
          <InlineText value={block.text} muted />
        </View>
      </View>
    );
  }
  const muted = block.text.startsWith('**Effective date:**') || block.text.startsWith('Effective date:');
  return <InlineText value={block.text} muted={muted} />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  intro: {
    gap: Spacing.two,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletBody: {
    flex: 1,
    minWidth: 0,
  },
  em: {
    fontStyle: 'italic',
  },
  rule: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.one,
  },
});
