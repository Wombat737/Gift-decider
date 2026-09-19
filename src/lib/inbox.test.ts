import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  acceptDemoOutgoingRequest,
  listDemoGiverAccessRequests,
  listDemoGiverPeople,
  searchDemoWishlistItems,
} from './demo-social';
import {
  deleteDemoItem,
  getDemoItem,
  listDemoItems,
  listDemoSharedItems,
  resetDemoStore,
} from './demo-store';
import { peekGiverCatalog, resetGiverCatalog } from './giver-catalog';
import {
  acceptBannerText,
  ackReadyInbox,
  applyPeopleInbox,
  badgeCountLabel,
  pendingRequestCount,
  requestBannerText,
  resetInboxSeen,
} from './inbox';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Owner delete hides items from owner and givers', () => {
  beforeEach(() => {
    resetDemoStore();
    resetGiverCatalog();
  });

  it('hard-delete drops the item from owner list, share list, search, and catalog', () => {
    assert.ok(listDemoItems().some((item) => item.id === 'demo-mug'));
    assert.ok(listDemoSharedItems('demo').some((item) => item.id === 'demo-mug'));
    assert.ok(listDemoSharedItems('demo-birthday').some((item) => item.id === 'demo-mug'));
    assert.ok(searchDemoWishlistItems('mug').some((hit) => hit.id === 'demo-mug'));

    deleteDemoItem('demo-mug');

    assert.equal(getDemoItem('demo-mug'), null);
    assert.equal(listDemoItems().some((item) => item.id === 'demo-mug'), false);
    assert.equal(listDemoSharedItems('demo').some((item) => item.id === 'demo-mug'), false);
    assert.equal(listDemoSharedItems('demo-birthday').some((item) => item.id === 'demo-mug'), false);
    assert.equal(searchDemoWishlistItems('mug').some((hit) => hit.id === 'demo-mug'), false);
    assert.equal(peekGiverCatalog('demo').some((item) => item.id === 'demo-mug'), false);
    assert.ok(listDemoItems().some((item) => item.id === 'demo-espresso'));
    assert.ok(listDemoSharedItems('demo').some((item) => item.id === 'demo-espresso'));
  });

  it('owner item screen confirms before remove; giver sticky footer stays untouched', () => {
    const ownerItem = source('src/app/(app)/item/[id].tsx');
    const giverItem = source('src/app/g/[token]/[itemId].tsx');
    assert.match(ownerItem, /PrettyCopy\.removeGift/);
    assert.match(ownerItem, /confirmDestructive/);
    assert.match(ownerItem, /removeItem/);
    assert.equal(/comment/i.test(ownerItem), false);
    assert.equal(/StatusChip/.test(ownerItem), false);
    assert.match(giverItem, /footer=\{/);
    assert.match(giverItem, /nativePress/);
    assert.match(giverItem, /updateStatus\('purchased'\)/);
  });
});

describe('Request badge and accept flip', () => {
  beforeEach(() => {
    resetDemoStore();
    resetInboxSeen();
  });

  it('pending request count and banner copy follow the owner inbox', () => {
    const inbox = listDemoGiverAccessRequests();
    assert.ok(inbox.length >= 1);
    assert.equal(pendingRequestCount(inbox), inbox.length);
    assert.equal(pendingRequestCount([]), 0);
    assert.equal(badgeCountLabel(0), null);
    assert.equal(badgeCountLabel(1), '1');
    assert.equal(badgeCountLabel(12), '9+');
    assert.match(requestBannerText(inbox) ?? '', /Alex asked to buy gifts for you/);
    assert.equal(requestBannerText([]), null);
  });

  it('first snapshot does not toast existing ready pins; pending → active is newly ready', () => {
    const people = listDemoGiverPeople();
    const first = applyPeopleInbox(people, null);
    assert.equal(first.newlyReady.length, 0);
    assert.ok(first.nextSeen.pendingPinIds.includes('demo-pin-mum'));
    assert.equal(first.nextSeen.unackedReadyIds.length, 0);

    acceptDemoOutgoingRequest('demo-person-mum');
    const after = applyPeopleInbox(listDemoGiverPeople(), first.nextSeen);
    assert.equal(after.newlyReady.length, 1);
    assert.equal(after.newlyReady[0]?.handle, 'mum');
    assert.match(acceptBannerText(after.newlyReady) ?? '', /Mum accepted/);
    assert.ok(after.nextSeen.unackedReadyIds.includes('demo-pin-mum'));
    assert.equal(after.nextSeen.pendingPinIds.includes('demo-pin-mum'), false);

    const still = applyPeopleInbox(listDemoGiverPeople(), after.nextSeen);
    assert.equal(still.newlyReady.length, 1);
    const acked = applyPeopleInbox(listDemoGiverPeople(), ackReadyInbox(still.nextSeen));
    assert.equal(acked.newlyReady.length, 0);
  });

  it('wishlist, People, and Requests surface badge + pending highlight', () => {
    const wishlist = source('src/app/(app)/wishlist.tsx');
    const people = source('src/app/(app)/people.tsx');
    const requests = source('src/app/(app)/requests.tsx');
    assert.match(wishlist, /HeaderInboxLink/);
    assert.match(wishlist, /pendingRequests/);
    assert.match(wishlist, /InboxBanner/);
    assert.match(wishlist, /pending-giver-requests/);
    assert.match(people, /accepted-giver-pins/);
    assert.match(people, /selected=\{justReady\}/);
    assert.match(people, /Waiting for them to accept/);
    assert.match(people, /They accepted \(demo\)/);
    assert.match(people, /usesDemoData\(\)/);
    assert.match(requests, /InboxBanner/);
    assert.match(requests, /selected/);
    assert.match(requests, /Pending/);
    assert.equal(/expo-notifications/.test(wishlist), false);
  });
});
