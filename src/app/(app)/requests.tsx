import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { InboxBanner } from '@/components/inbox-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useInbox } from '@/context/inbox-context';
import { requestBannerText } from '@/lib/inbox';
import type { GiverAccessRequest } from '@/lib/types';
import { listGiverAccessRequests, respondGiverAccess } from '@/services/giver-social';

export default function RequestsScreen() {
  const { refreshInbox } = useInbox();
  const [requests, setRequests] = useState<GiverAccessRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const banner = requestBannerText(requests);

  const refresh = useCallback(async () => {
    try {
      setRequests(await listGiverAccessRequests());
      await refreshInbox();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load requests');
    }
  }, [refreshInbox]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onRespond(memberId: string, action: 'accept' | 'decline' | 'block') {
    setBusy(true);
    setMessage(null);
    try {
      await respondGiverAccess(memberId, action);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Requests' }} />

      {message ? (
        <ThemedText type="small" themeColor="accent">
          {message}
        </ThemedText>
      ) : null}

      {banner ? (
        <InboxBanner title="Needs a look" body={banner} accessibilityLabel="pending-giver-requests" />
      ) : null}

      {requests.length === 0 ? (
        <EmptyState
          kind="invites"
          title="No pending requests"
          body="Share a link anytime. Handle search only works if your discoverability is Anyone with handle."
        />
      ) : (
        requests.map((request) => (
          <Card key={request.member_id} selected>
            <ThemedText type="eyebrow" themeColor="brand">
              Pending
            </ThemedText>
            <ThemedText type="titleSm">{request.display_name || `@${request.handle}`}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {request.handle ? `@${request.handle}` : 'Asked to be a giver on your list'}
            </ThemedText>
            <Button
              label="Accept"
              disabled={busy}
              onPress={() => void onRespond(request.member_id, 'accept')}
            />
            <Button
              label="Decline"
              variant="secondary"
              disabled={busy}
              onPress={() => void onRespond(request.member_id, 'decline')}
            />
            <Button
              label="Block"
              variant="ghost"
              disabled={busy}
              onPress={() => void onRespond(request.member_id, 'block')}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
