import { usesDemoData } from '@/lib/app-mode';
import { supabase } from '@/lib/supabase';

const FALLBACK = 'Couldn’t delete your account. Check your connection and try again.';

async function messageFromInvokeError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = (await context.clone().json()) as { error?: unknown };
        if (typeof body.error === 'string' && body.error.trim() && body.error.length < 180) {
          return body.error.trim();
        }
      } catch {
        // Keep the fallback when the function returns a non-JSON body.
      }
    }
  }
  return FALLBACK;
}

/** Deletes the signed-in account via the delete-account edge function. */
export async function deleteOwnAccount(): Promise<void> {
  if (usesDemoData() || !supabase) {
    throw new Error('Explore demo stays on this device. There’s no saved account to delete.');
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error) throw new Error(await messageFromInvokeError(error));

  const ok = Boolean(data && typeof data === 'object' && 'ok' in data && (data as { ok?: unknown }).ok === true);
  if (!ok) throw new Error(FALLBACK);
}
