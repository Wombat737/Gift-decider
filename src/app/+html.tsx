import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const rawBase = (process.env.EXPO_BASE_URL || '').trim();
const baseHref = rawBase ? `${rawBase.replace(/\/$/, '')}/` : '/';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <base href={baseHref} />
        <title>Gift Decider</title>
        <meta
          name="description"
          content="Pick gifts from a living photo wishlist. Demo — no install, no Supabase required."
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
