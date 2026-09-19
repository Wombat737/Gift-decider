import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import {
  ackReadyInbox,
  applyPeopleInbox,
  loadInboxSeen,
  pendingRequestCount,
  saveInboxSeen,
  type InboxSeen,
} from '@/lib/inbox';
import type { GiverAccessRequest, GiverPerson } from '@/lib/types';
import { listGiverAccessRequests, listGiverPeople } from '@/services/giver-social';

type InboxContextValue = {
  requests: GiverAccessRequest[];
  people: GiverPerson[];
  pendingRequests: number;
  newlyReady: GiverPerson[];
  loading: boolean;
  refreshInbox: () => Promise<void>;
  ackReady: () => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<GiverAccessRequest[]>([]);
  const [people, setPeople] = useState<GiverPerson[]>([]);
  const [newlyReady, setNewlyReady] = useState<GiverPerson[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshInbox = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setPeople([]);
      setNewlyReady([]);
      return;
    }

    setLoading(true);
    try {
      const [nextRequests, nextPeople] = await Promise.all([listGiverAccessRequests(), listGiverPeople()]);
      const { newlyReady: nextReady, nextSeen } = applyPeopleInbox(nextPeople, loadInboxSeen());
      saveInboxSeen(nextSeen);
      setRequests(nextRequests);
      setPeople(nextPeople);
      setNewlyReady(nextReady);
    } catch {
      // Inbox is advisory — list screens still load their own data.
    } finally {
      setLoading(false);
    }
  }, [user]);

  const ackReady = useCallback(() => {
    const seen = loadInboxSeen();
    if (!seen) {
      setNewlyReady([]);
      return;
    }
    const next: InboxSeen = ackReadyInbox(seen);
    saveInboxSeen(next);
    setNewlyReady([]);
  }, []);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  const value = useMemo<InboxContextValue>(
    () => ({
      requests,
      people,
      pendingRequests: pendingRequestCount(requests),
      newlyReady,
      loading,
      refreshInbox,
      ackReady,
    }),
    [ackReady, loading, newlyReady, people, refreshInbox, requests],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const value = use(InboxContext);
  if (!value) {
    throw new Error('useInbox must be used inside InboxProvider');
  }
  return value;
}
