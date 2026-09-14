# Gift Decider

Mobile wishlist app for gift-givers who need to pick from a recipient’s **living photo wishlist**.

- Recipients curate photos + notes + taste/vibes + an optional buy URL
- Occasion packs (birthday, housewarming, …) each get their own giver link
- Givers open a shared read-only link: soft-lock, chip in, AU store search, dead-link heal
- **Surprise gifts:** reserved / purchased / pledge progress is **giver-only** while a gift is in flight
- When a **group gift’s reveal date** arrives, the recipient sees **who it’s from** (names / Anonymous) — not the dollar amounts, and **not** as soon as it’s funded
- Instagram v1: paste a public post URL → **preview stub** → pin as an item
- Soft-launch ready: polished UI, EAS build profiles, privacy + account-deletion stubs
- Real Stripe/PayID, Meta Instagram OAuth, and **actual store submit** (Wombat’s Apple/Play accounts) stay out of scope

This repo is a thrifty **Expo + Supabase** starter: screens navigate, schema + RLS exist, auth and Instagram are stubbed where production work still has to happen.

## Open the web demo

No install, no Expo CLI, no Supabase. Open this on your phone:

**https://wombat737.github.io/Gift-decider/**

Tap **Explore demo**, then walk the mate demo below (Phase 2–3 features are still there). The UI is polished for phone browsers — GitHub Pages is the primary share surface.

Giver shortcuts (GitHub Pages subpath `/Gift-decider`):

- Whole list: [https://wombat737.github.io/Gift-decider/g/demo](https://wombat737.github.io/Gift-decider/g/demo)
- Birthday pack: [https://wombat737.github.io/Gift-decider/g/demo-birthday](https://wombat737.github.io/Gift-decider/g/demo-birthday)
- Housewarming pack: [https://wombat737.github.io/Gift-decider/g/demo-housewarming](https://wombat737.github.io/Gift-decider/g/demo-housewarming)

If that 404s, GitHub Pages is not switched on yet (one click):

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **`gh-pages`** / **`/` (root)** → Save
4. Wait ~1 minute, then reload the URL above

Or deploy a root-path copy to your own free host (no secrets required beyond logging in):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Wombat737/Gift-decider)

Netlify: import the GitHub repo. Build command `npx expo export -p web`, publish directory `dist`. SPA redirects are already in `public/_redirects` and `netlify.toml`.

From this repo:

```bash
npm install
npm run deploy    # exports with EXPO_BASE_URL=/Gift-decider and pushes gh-pages
```

## What to show mates (2 minutes)

Send them the Pages demo on their phone, or sit together and tap:

1. **Explore demo** — recipient grid. No Taken/Bought. Filter **Housewarming**.
2. Open **Home espresso machine** — still unspoiled (future reveal date, even if givers fund it). **Burr coffee grinder** already shows **From the group** (reveal date in the past). Settings → Privacy / deletion stub if a mate asks “is this a real app?”
3. **Share / occasions** → **Copy invite** (Birthday or Housewarming) or **Open giver view**.
4. As a giver: confidence chips, AU search, soft-lock, espresso chip-in progress + **Simulate funded (demo)** (owner still unspoiled), then **Simulate reveal date = yesterday**. Linen throw dead-link heal.
5. Flip back to the owner tab: espresso **From the group**; everything else still looks untouched except the grinder (already revealed).

Direct giver links (keep the `/Gift-decider` prefix):

- [Whole list](https://wombat737.github.io/Gift-decider/g/demo)
- [Birthday](https://wombat737.github.io/Gift-decider/g/demo-birthday)
- [Housewarming](https://wombat737.github.io/Gift-decider/g/demo-housewarming)
- [Privacy stub](https://wombat737.github.io/Gift-decider/privacy)

## Phase 4 (soft launch)

Visual polish on the existing IA — owner vs giver pills, gift cards, empty states, invite copy. No information-architecture redesign. Group-gift reveal is now gated by a **reveal date**, not by funded.

| Piece | Where |
| --- | --- |
| **EAS profiles** | `eas.json` — `development` (dev client, internal APK), `preview` (internal APK / ad hoc for mates), `production` (AAB + autoIncrement) |
| **App identity** | `app.json` — name Gift Decider, slug `gift-decider`, scheme `giftdecider`, terracotta gift icons/splash |
| **Privacy + deletion** | `/privacy` (public) and **Settings** (signed-in). Deletion is a mailto stub (`EXPO_PUBLIC_SUPPORT_EMAIL`) |
| **Analytics** | `src/lib/analytics.ts` — no-op unless `EXPO_PUBLIC_ANALYTICS_ENABLED=true` (console only). No paid account. |

Store submit itself is **not** done here. Wombat still needs Apple Developer, Play Console, and payment.

## Phase 3 (still here)

Surprise-safe rule: the recipient/owner never sees reserved, purchased, who locked it, chip-in **progress**, or that a group gift is funded. On/after the **reveal date** givers picked, they see that it’s from the group and **who chipped in** (display names, or Anonymous). They still never see dollar amounts. Funded ≠ reveal.

| Feature | Where | Demo how-to (no Supabase, no LLM key) |
| --- | --- | --- |
| **Reveal-date group gift** | Owner item on/after `reveal_at`; givers keep the pledge bar | Housewarming → **Home espresso machine** (reveal date in the future). As a giver, tap **Simulate funded (demo)** — flip to the owner tab: still unspoiled. Back as a giver, tap **Simulate reveal date = yesterday** (or **today**). Owner espresso then shows **From the group** and **who chipped in** (Alex, Anonymous, …). **Burr coffee grinder** is already funded with a past reveal date so the owner grid shows it immediately. |
| **Dead-link heal** | Giver item only | Housewarming → **Washed linen throw**. Giver sees “link looks dead” plus vibe-close alternatives (sage linen / oatmeal cotton). Owner item has no heal UI. |
| **Exact lock** | Giver heal on a locked item | Birthday → **Speckled ceramic mug** (🔒). Mark **Link’s dead**. Recovery searches for that SKU only — no substitutes. |
| **Vibe improv** | Giver confidence + substitute copy | Heuristic uses title + vibe tags. Optional LLM via `EXPO_PUBLIC_OPENAI_API_KEY` / `EXPO_PUBLIC_LLM_URL` or the `improv-substitutes` Edge Function when a key is present. Demo stays deterministic without a key. |

## Phase 2 (still here)

Surprise-safe rule is unchanged for in-flight gifts.

| Feature | Where | Demo how-to (no Supabase) |
| --- | --- | --- |
| **Taste / vibe board** | Owner add + item edit; givers see chips | Explore demo → open **Speckled ceramic mug** or **A plant that can survive me**. Edit vibes / Exact vs Taste. Giver view shows the same chips plus a lock if “No substitutions”. |
| **No substitutions lock** | Owner toggle; giver lock | Mug is locked. Owner sees 🔒; giver sees “No substitutes”. Dead-link heal honours this (exact-SKU recovery only). |
| **Occasion packs** | Share screen; giver URL scopes items | Share / occasions → **Birthday** (`/g/demo-birthday`) vs **Housewarming** (`/g/demo-housewarming`). Create another pack and assign items. |
| **Giver confidence** | Giver list + item only | On `/g/demo`: mug → Safe pick; socks → Needs size; plant → Bold. Owner grid has no score. |
| **AU buy helpers** | Giver item | Open any gift as a giver → Amazon AU / Kmart / Target AU / Big W search from the title. |
| **Soft lock** | Giver item; other givers see Taken/Bought **without names** | Socks start Taken. Reserve the mug; the owner wishlist still looks untouched. |
| **Group / chip-in** | Giver item; honour system, no Stripe | Housewarming → **Home espresso machine**. Progress is giver-only. Enabling group gift asks for a **reveal date**. |

Local demo (empty `.env.local`):

```bash
npm install
npx expo start --web
```

1. **Explore demo** → recipient wishlist (no Taken/Bought badges, no pledge bar). Espresso is not yet “from the group”; **Burr coffee grinder** already is (past reveal date).
2. Filter **Housewarming**. Open **Home espresso machine** — still a normal unspoiled item.
3. **Share / occasions** → **Open giver view** for Housewarming (or `/g/demo-housewarming`).
4. Open espresso as a giver: see chip-in progress and the future reveal date. Tap **Simulate funded (demo)**. Flip to the owner tab — espresso is **still unspoiled**.
5. Back as a giver, tap **Simulate reveal date = yesterday** (or **today**). Owner espresso now shows **From the group** + names.
6. Open **Washed linen throw**: dead-link heal + vibe substitutes. Owner never sees this panel.
7. Optional: giver mug → **Link’s dead** → exact-SKU recovery only.

Sample data lives in `localStorage` (`giftdecider.demo.v4`). `/g/demo` is the whole list; occasion tokens are `demo-birthday` and `demo-housewarming`.

```bash
npx tsc --noEmit
npm test    # surprise-safe + demo-walk unit tests (no Supabase)
```

## Stack

- Expo SDK 57, React Native, Expo Router, TypeScript
- Supabase: Postgres, Auth, Storage, Edge Functions
- Session storage: `expo-sqlite` on iOS/Android, `localStorage` on web
- Demo mode so you can run the UI before a Supabase project exists

## Run locally

```bash
npm install
cp .env.example .env.local
npx expo start
```

Then:

- **iOS:** scan the QR code with the Camera app (or Expo Go, if it matches this SDK)
- **Android:** Expo Go, or an emulator
- **Web:** press `w` — useful for clicking through screens on a laptop

If `.env.local` still has placeholders, the app starts in **demo mode**. Tap **Explore demo** on the sign-in screen. Sample gifts persist in the browser; paste-URL uses an in-app stub; share tokens are `demo`, `demo-birthday`, `demo-housewarming`. No LLM key required.

You do **not** need Docker or a hosted Supabase project to walk the screens.

## Environment variables

Copy `.env.example` → `.env.local`. Restart Expo after edits.

| Variable | What it is |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) or local `http://127.0.0.1:54321` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key. **Never** put the secret/service-role key in the app |
| `EXPO_PUBLIC_APP_URL` | Public origin used when composing share links |
| `EXPO_PUBLIC_APPLE_AUTH_ENABLED` | `false` until Apple + Supabase provider is done |
| `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` until Google + Supabase provider is done |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Placeholder |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Placeholder |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Placeholder |
| `EXPO_PUBLIC_OPENAI_API_KEY` | Optional. Client-side LLM for substitute copy. Leave empty for the demo stub |
| `EXPO_PUBLIC_LLM_URL` | Optional. POST endpoint that returns `{ suggestions: [{ title, reason }] }` |
| `EXPO_PUBLIC_LLM_MODEL` | Optional. Defaults to `gpt-4o-mini` |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Optional. Hosted policy. Empty uses in-app `/privacy` |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Mailto inbox for account-deletion requests (default `hello@giftdecider.app`) |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `true` logs events to the console. Default off. No paid analytics product |

Both Supabase values are meant to be public. **RLS is what keeps data private** — apply the migrations before pointing the app at a live project.

## Supabase

### 1. Create a project

[database.new](https://database.new) (or `eas integrations:supabase:connect` once you are on EAS).

### 2. Apply the migrations

SQL lives in `supabase/migrations/`. Apply **in order** (init, Phase 2, Phase 3, reveal-date).

**Dashboard:** SQL Editor → paste each file → run.

**CLI (local):**

```bash
npx supabase start
npx supabase db reset
npx supabase status
```

Put the API URL + publishable key from `status` into `.env.local`. A physical phone cannot reach `127.0.0.1`; use your computer’s LAN IP instead.

**CLI (hosted):**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### What the migrations create

- `profiles` — handle, display name, locale (`en-AU` default)
- `wishlists` — one default list per signup, plus `share_token`
- `occasions` — named packs under a wishlist, each with a `share_token`
- `wishlist_items` — image, title, notes, source, buy URL, vibe tags, `item_kind`, size hint, target amount, occasion, no-substitution, giver-only status / group-gift / `buy_url_dead`, `funded_at`, `reveal_at` (calendar date)
- `item_pledges` — honour-system chip-ins (givers via RPC). **Owners have no SELECT.** After `reveal_at` (not merely `funded_at`), `list_owned_revealed_contributors` returns **names only** (Anonymous if blank) — never amounts
- `wishlist_members` — email invites
- `link_previews` — URL cache for the paste flow
- Storage bucket `wishlist-images` (`{user_id}/...`)
- Trigger: new `auth.users` row → profile + empty wishlist
- RLS: owner full CRUD on list/items/occasions; accepted members SELECT + reserve/purchased/group-gift; pledges hidden from owners
- RPCs for anonymous givers: `get_shared_wishlist`, `get_shared_wishlist_items`, `set_shared_item_status`, `set_shared_item_group_gift` (requires reveal date when enabling), `set_shared_item_reveal_at`, `list_shared_item_pledges`, `add_shared_item_pledge`, `mark_shared_item_funded`, `set_shared_item_link_dead` (wishlist **or** occasion token)
- Owner RPC: `list_owned_revealed_contributors` (authenticated owner, group gifts on/after `reveal_at` only — not merely funded)

### 3. Auth settings

Supabase → Authentication → URL Configuration:

- Redirect URLs: `giftdecider://auth/callback`, `http://localhost:8081`, your EAS web origin
- Enable **Email** magic link (on by default)

### 4. Preview Edge Function (stub)

```bash
npx supabase functions serve preview-url --no-verify-jwt
# or
npx supabase functions deploy preview-url
```

`POST { "url": "https://www.instagram.com/p/..." }` returns a **fake** image + caption. It does not scrape Instagram.

### 5. Optional substitute improv function

```bash
npx supabase functions serve improv-substitutes --no-verify-jwt
# or
npx supabase functions deploy improv-substitutes
```

Without `OPENAI_API_KEY` in the function env it returns `{ "source": "stub", "suggestions": [] }` and the app uses its local catalog.

## Screens

| Route | Who | What |
| --- | --- | --- |
| `/` | Anyone | Redirects to sign-in or `/wishlist` |
| `/sign-in` | Anyone | Magic link + Apple/Google placeholders + Explore demo |
| `/wishlist` | Recipient | Photo grid + occasion filter (no reserve/purchased/pledges). **From the group** only on/after the reveal date |
| `/add` | Recipient | Manual item, vibe board, occasion, lock, optional target $ |
| `/paste` | Recipient | Paste Instagram URL → stub preview → pin |
| `/item/[id]` | Recipient | Item detail + edit vibes. Group reveal (names) on/after the reveal date |
| `/share` | Recipient | Whole-list + occasion **Copy invite** (mate-ready text) |
| `/settings` | Recipient | Privacy link, account-deletion mailto stub, sign out |
| `/privacy` | Anyone | Store-listing privacy stub (works on `/Gift-decider/privacy`) |
| `/g/[token]` | Giver | Read-only list **with** Taken/Bought (no names), confidence, link-issue flag |
| `/g/[token]/[itemId]` | Giver | Soft lock, group pledges, reveal date, mark funded, dead-link heal, AU buy helpers |
| `/auth/callback` | Auth | Magic-link landing stub |

## What’s stubbed (on purpose)

- **Instagram** — paste URL only. No Meta OAuth, no Saves API, no scrapers
- **`preview-url`** — returns sample image + caption
- **Apple / Google Sign-In** — buttons that explain they are placeholders
- **Email invites** — inserts `wishlist_members` when Supabase is configured; does not send mail
- **Camera / Storage upload** — add-item takes an image URL; bucket + RLS are ready
- **AI matches / dead-link heal** — heuristic catalog + optional LLM. Demo is stubbed and offline-safe
- **Group-gift reveal to recipient** — names / Anonymous on/after the reveal date, not when funded. No Stripe or PayID
- **Account deletion** — Settings mailto stub until a backend mailer exists
- **Analytics** — no-op hook; optional console traces. No paid account
- **Real payments** — honour-system pledges only. No Stripe or PayID
- **Store submit** — EAS profiles are ready; Apple/Play upload needs Wombat’s accounts
- **Affiliates** — AU helpers are plain search URLs (Amazon AU, Kmart, Target AU, Big W)

## Soft launch checklist

Do this when you are ready for 10–20 mates on device. **Do not** pay Apple/Play from this PR — that is Wombat’s accounts.

### 1. Accounts

- [ ] **Apple Developer** ($99/year) — enroll at [developer.apple.com](https://developer.apple.com). You’ll need this for TestFlight.
- [ ] **Google Play Console** ($25 one-off) — [play.google.com/console](https://play.google.com/console). Internal testing track does not require a public listing.
- [ ] **Expo / EAS** — `npm i -g eas-cli` then `eas login`. `eas init` in this repo (creates the EAS project; slug is `gift-decider`).
- [ ] **Supabase production project** — [database.new](https://database.new), apply migrations in order, set `EXPO_PUBLIC_SUPABASE_*` on EAS (or `eas env:create`). Optional: `eas integrations:supabase:connect`.
- [ ] **Privacy policy URL** — in-app `/privacy` is enough to start. Point `EXPO_PUBLIC_PRIVACY_POLICY_URL` at a hosted copy when you have a domain. App Store Connect and Play Data safety will ask for this URL.
- [ ] **Support / deletion inbox** — set `EXPO_PUBLIC_SUPPORT_EMAIL` to an address you actually read.

### 2. EAS Build

`eas.json` already has **development**, **preview**, and **production**.

```bash
npx expo install expo-dev-client   # once, before the first development profile build
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile preview --platform all     # internal APK + ad hoc IPA for mates
eas build --profile production --platform all  # store artifacts (AAB + IPA)
```

Preview is what you hand to mates before TestFlight. Production is what you submit.

### 3. Invite 10–20 mates

**Fastest (no stores):** send https://wombat737.github.io/Gift-decider/ plus a Birthday or Housewarming giver link. Phone browser. No install.

**iOS TestFlight**

1. App Store Connect → create the app (bundle `com.giftdecider.app`, name Gift Decider — name still parked).
2. `eas submit --platform ios --profile production` (or upload the preview IPA if you only want internal).
3. TestFlight → Internal Testing → add testers by Apple ID email. They install TestFlight, then your build.

**Play internal testing**

1. Play Console → create the app → Internal testing track.
2. `eas submit --platform android --profile production` (submit profile uses `track: internal`).
3. Create an email list of testers (up to 100 on internal). Share the opt-in link.

**EAS internal distribution** (preview profile): Expo gives you a QR / URL. iOS needs each device UDID registered unless you use Apple’s ad hoc/enterprise flow.

### 4. Store listing leftovers (not this PR)

- Privacy policy URL + account deletion (Settings already stubs both)
- App Store / Play data safety: wishlists, email, optional giver names on locks — no tracking SDK unless you turn analytics on
- Apple Sign-In / Google Sign-In still placeholders; Expo Go is fine until you add a **dev client**
- `ITSAppUsesNonExemptEncryption` is `false` in `app.json` so export-compliance is a checkbox, not a wait

Expo Go is fine for the web/demo loop. Native Sign in with Apple / Google needs a **dev client**, not Expo Go.

## Layout

```
src/app/                 Expo Router screens
src/context/             Auth + wishlist
src/services/            Preview + wishlist API (Supabase or demo store)
src/lib/                 Env, types, confidence, AU buy URLs, substitutes, analytics stub, demo store
supabase/migrations/     Schema + RLS (init + phase2 + phase3 + reveal_at)
supabase/functions/      preview-url stub + optional improv-substitutes
```

## Scripts

```bash
npx expo start          # dev server
npx expo start --web
npx tsc --noEmit        # types
npm test                # surprise-safe + soft-launch stubs (node:test)
npm run export:web      # production SPA → dist/
npm run deploy          # GitHub Pages (subpath /Gift-decider)
```
