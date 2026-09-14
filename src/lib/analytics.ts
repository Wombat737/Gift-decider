import { env } from '@/lib/env';

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type AnalyticsHandler = (event: string, props?: AnalyticsProps) => void;

let handler: AnalyticsHandler | null = null;

/** Swap in PostHog / Amplitude later. Default is a no-op (no paid account required). */
export function setAnalyticsHandler(next: AnalyticsHandler | null) {
  handler = next;
}

export function track(event: string, props?: AnalyticsProps) {
  handler?.(event, props);
  if (!env.analyticsEnabled) return;
  // Stub sink — enable with EXPO_PUBLIC_ANALYTICS_ENABLED=true for console traces.
  console.info('[analytics]', event, props ?? {});
}
