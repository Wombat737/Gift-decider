# Gift Decider

Mobile wishlist app for gift-givers who need to pick from a recipient’s **living photo wishlist**.

- Recipients curate photos + notes + taste/vibes + an optional buy URL
- Occasion packs (birthday, housewarming, …) each get their own giver link
- Givers open a shared read-only link: soft-lock, chip in, AU store search, dead-link heal
- **Surprise gifts:** reserved / purchased / pledge progress is **giver-only** while a gift is in flight
- When a **group gift is funded**, the recipient finally sees **who it’s from** (names / Anonymous) — not the dollar amounts
- Instagram v1: paste a public post URL → **preview stub** → pin as an item
- Real Stripe/PayID, Meta Instagram OAuth, and store submit are **out of this phase** (Phase 4)

This repo is a thrifty **Expo + Supabase** starter: screens navigate, schema + RLS exist, auth and Instagram are stubbed where production work still has to happen.

## Open the web demo

No install, no Expo CLI, no Supabase. Open this on your phone:

**https://wombat737.github.io/Gift-decider/**

Tap **Explore demo**, then walk the Phase 3 loop below (Phase 2 features are still there).

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

## Phase 3 (what’s in this repo)

Surprise-safe rule: the recipient/owner never sees reserved, purchased, who locked it, or chip-in **progress**. After a group gift is **funded**, they see that it’s from the group and **who chipped in** (display names, or Anonymous). They still never see dollar amounts.

| Feature | Where | Demo how-to (no Supabase, no LLM key) |
| --- | --- | --- |
| **Funded group reveal** | Owner item after funded; givers keep the pledge bar | Housewarming → **Home espresso machine**. As a giver, tap **Simulate funded (demo)** (or chip in the rest / **Mark funded**). Flip back to the owner tab → espresso shows **From the group** and **who chipped in** (Alex, Anonymous, …). Until that moment the owner item is unspoiled. |
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
| **Group / chip-in** | Giver item; honour system, no Stripe | Housewarming → **Home espresso machine**. Progress is giver-only until funded. |

Local demo (empty `.env.local`):

```bash
npm install
npx expo start --web
```

1. **Explore demo** → recipient wishlist (no Taken/Bought badges, no pledge bar, espresso is not yet “from the group”).
2. Filter **Housewarming**. Open **Home espresso machine** — still a normal unspoiled item.
3. **Share / occasions** → **Open giver view** for Housewarming (or `/g/demo-housewarming`).
4. Open espresso as a giver: see chip-in progress. Tap **Simulate funded (demo)**.
5. Open **Washed linen throw**: dead-link heal + vibe substitutes. Owner never sees this panel.
6. Flip back to the owner tab → espresso **From the group** + names. Throw is still just a throw — no heal UI.
7. Optional: giver mug → **Link’s dead** → exact-SKU recovery only.

Sample data lives in `localStorage` (`giftdecider.demo.v3`). `/g/demo` is the whole list; occasion tokens are `demo-birthday` and `demo-housewarming`.

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

Both Supabase values are meant to be public. **RLS is what keeps data private** — apply the migrations before pointing the app at a live project.

## Supabase

### 1. Create a project

[database.new](https://database.new) (or `eas integrations:supabase:connect` once you are on EAS).

### 2. Apply the migrations

SQL lives in `supabase/migrations/`. Apply **in order** (init, Phase 2, Phase 3).

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
- `wishlist_items` — image, title, notes, source, buy URL, vibe tags, `item_kind`, size hint, target amount, occasion, no-substitution, giver-only status / group-gift / `buy_url_dead`, `funded_at`
- `item_pledges` — honour-system chip-ins (givers via RPC). **Owners have no SELECT.** After `funded_at`, `list_owned_funded_contributors` returns **names only** (Anonymous if blank) — never amounts
- `wishlist_members` — email invites
- `link_previews` — URL cache for the paste flow
- Storage bucket `wishlist-images` (`{user_id}/...`)
- Trigger: new `auth.users` row → profile + empty wishlist
- RLS: owner full CRUD on list/items/occasions; accepted members SELECT + reserve/purchased/group-gift; pledges hidden from owners
- RPCs for anonymous givers: `get_shared_wishlist`, `get_shared_wishlist_items`, `set_shared_item_status`, `set_shared_item_group_gift`, `list_shared_item_pledges`, `add_shared_item_pledge`, `mark_shared_item_funded`, `set_shared_item_link_dead` (wishlist **or** occasion token)
- Owner RPC: `list_owned_funded_contributors` (authenticated owner, funded items only)

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
| `/wishlist` | Recipient | Photo grid + occasion filter (no reserve/purchased/pledges). **From the group** only after funded |
| `/add` | Recipient | Manual item, vibe board, occasion, lock, optional target $ |
| `/paste` | Recipient | Paste Instagram URL → stub preview → pin |
| `/item/[id]` | Recipient | Item detail + edit vibes. Funded reveal (names) when the group gift is funded |
| `/share` | Recipient | Whole-list link, occasion packs, stub email invite |
| `/g/[token]` | Giver | Read-only list **with** Taken/Bought (no names), confidence, link-issue flag |
| `/g/[token]/[itemId]` | Giver | Soft lock, group pledges, mark funded, dead-link heal, AU buy helpers |
| `/auth/callback` | Auth | Magic-link landing stub |

## What’s stubbed (on purpose)

- **Instagram** — paste URL only. No Meta OAuth, no Saves API, no scrapers
- **`preview-url`** — returns sample image + caption
- **Apple / Google Sign-In** — buttons that explain they are placeholders
- **Email invites** — inserts `wishlist_members` when Supabase is configured; does not send mail
- **Camera / Storage upload** — add-item takes an image URL; bucket + RLS are ready
- **AI matches / dead-link heal** — heuristic catalog + optional LLM. Demo is stubbed and offline-safe
- **Funded reveal to recipient** — names / Anonymous after funded. No Stripe or PayID
- **Real payments / store submit** — Phase 4
- **Affiliates** — AU helpers are plain search URLs (Amazon AU, Kmart, Target AU, Big W)

## Next: EAS / Apple / Play

1. `npm i -g eas-cli` and `eas login`
2. `eas init` in this repo (creates an Expo project)
3. Optional: `eas integrations:supabase:connect` to write env vars onto EAS
4. Development build (needed once Apple/Google native modules are added):

   ```bash
   eas build --profile development --platform ios
   eas build --profile development --platform android
   ```

5. **Apple Sign-In:** Apple Developer capability, App ID, Supabase → Sign in with Apple, then implement `expo-apple-authentication` (or Supabase’s guide). Flip `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`.
6. **Google Sign-In:** Google Cloud OAuth clients (iOS/Android/web), SHA-1 for Android, Supabase → Google, then wire `expo-auth-session` / native Google Sign-In. Fill the `EXPO_PUBLIC_GOOGLE_*` ids.
7. Store listings: privacy policy (wishlists + reservations), account deletion, and App Store / Play data safety forms.
8. Production builds: `eas build --platform ios` / `--platform android`, then `eas submit`.

Expo Go is fine for this scaffold. Native Sign in with Apple / Google needs a **dev client**, not Expo Go.

## Layout

```
src/app/                 Expo Router screens
src/context/             Auth + wishlist
src/services/            Preview + wishlist API (Supabase or demo store)
src/lib/                 Env, types, confidence, AU buy URLs, substitutes, demo store
supabase/migrations/     Schema + RLS (init + phase2 + phase3)
supabase/functions/      preview-url stub + optional improv-substitutes
```

## Scripts

```bash
npx expo start          # dev server
npx expo start --web
npx tsc --noEmit        # types
npm test                # surprise-safe demo walk (node:test)
npm run export:web      # production SPA → dist/
npm run deploy          # GitHub Pages (subpath /Gift-decider)
```
