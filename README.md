# Gift Decider

Mobile wishlist app for gift-givers who need to pick from a recipient’s **living photo wishlist**.

**Coral Coast** is the locked visual direction: pure white (`#FFFFFF` / `#FAFAFA`), coral brand (`#E85D4C`), sunshine only for chip-in and pledges (`#F5B942`). Plus Jakarta Sans for UI and titles (no serif headings). Success / purchased / reserved styling never appears on owner views.

- Recipients curate photos + notes + taste/vibes + an optional buy URL (paste the shop link on Add item to draft a photo + title)
- Occasion packs (birthday, housewarming, …) each get their own giver link
- Givers open a shared read-only link: soft-lock, chip in, AU store search, dead-link heal
- **Surprise gifts:** reserved / purchased / pledge progress is **giver-only** while a gift is in flight
- Group gifts have an **organiser** (who marked it a group gift, else the first named pledge, else “the organiser”). They buy; givers pay them via **PayID / BSB** (honour system — Gift Decider holds no money)
- When a **group gift’s reveal date** arrives, the recipient sees **who it’s from** (names / Anonymous) — not the dollar amounts, and **not** as soon as it’s funded
- Instagram v1: paste a public post URL → public OG/meta if Instagram exposes it → edit → pin. Honest empty if it hides the photo — never a fake sample gift
- Soft-launch ready: polished UI, EAS build profiles, privacy + account-deletion stubs
- Real Stripe, Meta Instagram OAuth, push notifications, and **actual store submit** (Wombat’s Apple/Play accounts) stay out of scope
- Push notifications are next; Ready to buy uses an in-app banner plus an email stub (`notify-organiser-ready-to-buy`)

This repo is an **Expo + Supabase** app: screens navigate, schema + RLS ship in `supabase/migrations`, and GitHub Pages stays in **Explore demo** (no secrets). Live magic-link on the phone is the **Vercel** root-path deploy with the two public keys. Instagram paste uses the same public OG fetch as buy links (no Meta OAuth, no unofficial scrape).

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

Or deploy a **root-path Explore demo** to your own free host (no secrets — same as Pages until you add env vars):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Wombat737/Gift-decider)

Netlify: import the GitHub repo. Build command `npx expo export -p web`, publish directory `dist`. SPA redirects are already in `public/_redirects` and `netlify.toml`.

For **magic-link on a phone**, connect this GitHub repo to Vercel and add the two public Supabase keys — see **Phone / Vercel live path** below. GitHub Pages stays Explore demo.

From this repo:

```bash
npm install
npm run deploy    # exports with EXPO_BASE_URL=/Gift-decider and pushes gh-pages
```

## Phone / Vercel live path

GitHub Pages has **no secrets** on purpose. Use Vercel when you want a live web app on your phone: root URL (not `/Gift-decider`), build-time `EXPO_PUBLIC_*` keys, magic-link that returns to `/auth/callback`.

Do this on a laptop once; then open the Vercel URL on the phone.

1. **Import the repo.** [vercel.com](https://vercel.com) → **Add New… → Project** → import **Wombat737/Gift-decider**. Framework preset can stay **Other** (`vercel.json` already sets `framework: null`). Root Directory: `.` (repo root). Do **not** set `EXPO_BASE_URL` — Vercel builds with it empty so assets load at `/`.
2. **Env vars (Production + Preview)** before you rely on magic-link. **Settings → Environment Variables**:
   - `EXPO_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the **anon / public** key only. Never the `service_role` key.
   Same names as `.env.local`. Expo inlines them when it runs `npx expo export -p web`.
3. **Deploy.** Copy the Production origin (e.g. `https://gift-decider.vercel.app`). If you added the vars after the first build, **Redeploy** so they are baked in.
4. **Share links.** Set `EXPO_PUBLIC_APP_URL` to that origin (no trailing slash, no `/Gift-decider`) for Production + Preview, then Redeploy again.
5. **Supabase redirects.** Authentication → URL Configuration → Redirect URLs, add:
   - `https://YOUR-APP.vercel.app/auth/callback`
   - the Preview origin + `/auth/callback` if you sign in on preview URLs
   Site URL can be the Production Vercel origin.
6. **Phone.** Open the Vercel URL → **Email me a magic link**. The mail should return you to `/auth/callback` on that same origin, then `/wishlist`.

Never commit `.env.local` or paste keys into GitHub Actions. Pages CI must stay secret-free so the public demo keeps working.

`vercel.json` runs `npx expo export -p web` → `dist/`, then rewrites unknown paths to the SPA (`index.html`) so `/wishlist`, `/g/…`, and `/auth/callback` work on refresh.

## What to show mates (2 minutes)

Send them the Pages demo on their phone, or sit together and tap:

1. **Explore demo** — recipient grid. No Taken/Bought. Filter **Housewarming**.
2. Open **Home espresso machine** — still unspoiled (future reveal date, even if givers fund it). **Burr coffee grinder** already shows **From the group** (reveal date in the past). Settings → Privacy / deletion stub if a mate asks “is this a real app?”
3. **Share / occasions** → **Copy invite** (Birthday or Housewarming) or **Open giver view**.
4. As a giver: mark group gift (reveal date + organiser + PayID note), chip in, **Simulate funded (demo)** → **Funded — time to buy** banner + email stub. Organiser marks purchased + delivery. Owner still unspoiled. Then **Simulate reveal date = yesterday**.
5. Flip back to the owner tab: espresso **From the group** + names only (no dollars, no PayID). Grinder is already revealed.
6. As a giver, open **Washed linen throw** (Housewarming). **Link may be broken** + **See alternatives** — Amazon AU / Kmart / Target AU searches. Flip to the owner item: no heal banner, no substitutes.

Direct giver links (keep the `/Gift-decider` prefix):

- [Whole list](https://wombat737.github.io/Gift-decider/g/demo)
- [Birthday](https://wombat737.github.io/Gift-decider/g/demo-birthday)
- [Housewarming](https://wombat737.github.io/Gift-decider/g/demo-housewarming)
- [Privacy stub](https://wombat737.github.io/Gift-decider/privacy)

## Phase 4 (soft launch)

Visual polish on the existing IA — owner vs giver pills, gift cards, empty states, invite copy. No information-architecture redesign. Group-gift reveal is now gated by a **reveal date**, not by funded. **Coral Coast** tokens replace Citrus Lane / Sunroom (white base, coral CTAs, sunshine pledges — no lemon wash).

| Piece | Where |
| --- | --- |
| **EAS profiles** | `eas.json` — `development` (dev client, internal APK), `preview` (internal APK / ad hoc for mates), `production` (AAB + autoIncrement) |
| **App identity** | `app.json` — name Gift Decider, slug `gift-decider`, scheme `giftdecider`, Coral Coast coral splash / white theme |
| **Privacy + deletion** | `/privacy` (public) and **Settings** (signed-in). Deletion is a mailto stub (`EXPO_PUBLIC_SUPPORT_EMAIL`) |
| **Analytics** | `src/lib/analytics.ts` — no-op unless `EXPO_PUBLIC_ANALYTICS_ENABLED=true` (console only). No paid account. |

Store submit itself is **not** done here. Wombat still needs Apple Developer, Play Console, and payment.

## Dead-link heal (giver-only)

When a `buy_url` looks dead, **givers** can check the link and see 1–3 close AU alternatives (title + merchant + search URL). Recipients never see the warning or the substitutes — surprise-safe.

| Piece | Where |
| --- | --- |
| **Contract** | `src/lib/heal-link.ts` — `healLink` / `healLinkAsync`. Same request/result shape for the stub and a future cheap LLM (`HealLinkLlm`). |
| **Detection (stub)** | Known-bad demo URLs (`broken-buy-link`, `dead-link`, …), malformed URLs, or `buy_url_dead`. Optional HEAD/GET via `supabase/functions/heal-link` — **no LLM key**. |
| **Suggestions** | Deterministic title / vibe / tag matcher in `src/lib/substitutes.ts`, then Amazon AU / Kmart / Target AU search URLs. |
| **`no_substitution`** | Flag “link looks broken” only. **No** alternatives. |
| **UI** | Giver list badge + banner; giver item **See alternatives** sheet. Owner `/wishlist` and `/item/[id]` never mount heal UI. |
| **Demo** | Housewarming → **Washed linen throw** (`https://example.com/broken-buy-link/…`). Check link auto-runs in demo. |

**Stub vs future LLM:** demo and CI use the heuristic only. Do not set `EXPO_PUBLIC_OPENAI_API_KEY` for this flow. Plug a model in later by implementing `HealLinkLlm` (or filling `heal-link` Edge Function suggestions) — the sheet already renders `title`, `merchant`, and `buyUrl`.

## Phase 3 (still here)

Surprise-safe rule: the recipient/owner never sees reserved, purchased, who locked it, chip-in **progress**, or that a group gift is funded. On/after the **reveal date** givers picked, they see that it’s from the group and **who chipped in** (display names, or Anonymous). They still never see dollar amounts. Funded ≠ reveal.

| Feature | Where | Demo how-to (no Supabase, no LLM key) |
| --- | --- | --- |
| **Reveal-date group gift** | Owner item on/after `reveal_at`; givers keep the pledge bar | Housewarming → **Home espresso machine** (reveal date in the future). As a giver, tap **Simulate funded (demo)** — flip to the owner tab: still unspoiled. Back as a giver, tap **Simulate reveal date = yesterday** (or **today**). Owner espresso then shows **From the group** and **who chipped in** (Alex, Anonymous, …). **Burr coffee grinder** is already funded with a past reveal date so the owner grid shows it immediately. |
| **Organiser + honour-system buy** | Giver item + list banner | Enabling a group gift asks for reveal date, organiser name, and PayID / BSB. States: Collecting → Ready to buy → Purchased → Revealed. Funded fires **Funded — time to buy** in-app (demo) plus `notify-organiser-ready-to-buy` email stub. Organiser marks purchased and picks delivery (`to_organiser` / collect / other). Owner never sees pay notes or delivery. |
| **Dead-link heal** | Giver list + item only | Housewarming → **Washed linen throw**. Badge **Link may be broken**, **See alternatives** sheet (sage linen / oatmeal cotton × Amazon AU / Kmart / Target AU). Owner item has no heal UI. |
| **Exact lock** | Giver heal on a locked item | Birthday → **Speckled ceramic mug** (🔒). Mark **Link’s dead**. Banner only — **no** substitutes. |
| **Vibe improv** | Giver confidence + substitute copy | Heuristic uses title + vibe tags. Optional LLM via `EXPO_PUBLIC_OPENAI_API_KEY` / `EXPO_PUBLIC_LLM_URL` or `improv-substitutes` / `heal-link` Edge Functions when a key is present. Demo stays deterministic without a key. |

## Phase 2 (still here)

Surprise-safe rule is unchanged for in-flight gifts.

| Feature | Where | Demo how-to (no Supabase) |
| --- | --- | --- |
| **Taste / vibe board** | Owner add + item edit; givers see chips | Explore demo → open **Speckled ceramic mug** or **A plant that can survive me**. Edit vibes / Exact vs Taste. Giver view shows the same chips plus a lock if “No substitutions”. |
| **No substitutions lock** | Owner toggle; giver lock | Mug is locked. Owner sees 🔒; giver sees “No substitutes”. Dead-link heal honours this (flag only — no alternatives). |
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
4. Open espresso as a giver: Alex is organiser, PayID note, chip-in progress, future reveal date. Tap **Simulate funded (demo)** — giver list/item show **Funded — time to buy** plus an email stub (no API key). Flip to the owner tab — espresso is **still unspoiled**.
5. As the organiser, mark purchased and pick delivery. Owner is still blind.
6. Back as a giver, tap **Simulate reveal date = yesterday** (or **today**). Owner espresso now shows **From the group** + names (still no dollars / PayID).
7. Open **Washed linen throw**: **Link may be broken** + **See alternatives**. Owner never sees this panel.
8. Optional: giver mug → **Link’s dead** → broken-link banner only (exact lock, no substitutes).

Sample data lives in `localStorage` (`giftdecider.demo.v5`). `/g/demo` is the whole list; occasion tokens are `demo-birthday` and `demo-housewarming`. Espresso starts collecting with a future reveal date; grinder is already purchased with yesterday’s reveal date.

```bash
npx tsc --noEmit
npm test    # surprise-safe + live RLS contract + env switch (no hosted project required)
```

## Stack

- Expo SDK 57, React Native, Expo Router, TypeScript
- **Coral Coast** UI: Plus Jakarta Sans on web (Google Fonts); native uses system-ui. Headings stay sans — Design may swap the exact sans later.
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

If `.env.local` still has placeholders (or you skip the copy), the app stays in **Explore demo**. Tap **Explore demo** on the sign-in screen. Sample gifts persist in the browser; Instagram paste stays honestly empty without a live function; share tokens are `demo`, `demo-birthday`, `demo-housewarming`. No LLM key and no Supabase project required.

Fill in a real URL + anon key and restart Expo: the sign-in screen leads with **Email me a magic link**, and lists persist in your project. **Explore demo still works** beside that — it never writes to the live database.

GitHub Pages deploys **without** those env vars, so the public demo stays useful.

## Environment variables

Copy `.env.example` → `.env.local`. Restart Expo after edits. Do not commit `.env.local`.

Vercel **Project Settings → Environment Variables** uses the **same `EXPO_PUBLIC_*` names**. They are inlined at `npx expo export -p web` — add or change a var, then Redeploy. Leave `EXPO_BASE_URL` unset on Vercel (root path). GitHub Pages CI sets `EXPO_BASE_URL=/Gift-decider` and must not get these keys.

| Variable | What it is |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) or local `http://127.0.0.1:54321` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon / publishable key from Project Settings → API. **Never** put the secret/service-role key in the app |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional alias if an older `.env.local` still uses this name |
| `EXPO_PUBLIC_APP_URL` | Public origin used when composing share links. On Vercel, set this to the Production URL (e.g. `https://YOUR-APP.vercel.app`) |
| `EXPO_PUBLIC_APPLE_AUTH_ENABLED` | `false` until Apple + Supabase provider is done |
| `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` until Google + Supabase provider is done |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Placeholder |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Placeholder |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Placeholder |
| `EXPO_PUBLIC_OPENAI_API_KEY` | Optional. Leave empty. Dead-link heal and vibe copy use the local stub without it |
| `EXPO_PUBLIC_LLM_URL` | Optional. Future plug-in (`healLinkAsync` / improv). Unused in the demo |
| `EXPO_PUBLIC_LLM_MODEL` | Optional. Defaults to `gpt-4o-mini` if a key is ever set |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Optional. Hosted policy. Empty uses in-app `/privacy` |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Mailto inbox for account-deletion requests (default `hello@giftdecider.app`) |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `true` logs events to the console. Default off. No paid analytics product |

Organiser email (`notify-organiser-ready-to-buy`) uses **server** secrets `RESEND_API_KEY` / `POSTMARK_SERVER_TOKEN` on the Edge Function — not `EXPO_PUBLIC_*`. Demo shows the stub without them.

Both Supabase values are meant to be public. **RLS is what keeps data private** — apply the migrations before pointing the app at a live project.

## Supabase (Wombat: free project → live lists)

You do **not** need this for GitHub Pages or `npm start` without env vars. Do this when you want real email magic links and persisted wishlists.

### 1. Create a free project

1. Open [database.new](https://database.new) (or [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**).
2. Sign in (GitHub is fine).
3. Organisation: your personal org is enough.
4. Name: `gift-decider` (or anything). Region: pick close to Australia (e.g. **Sydney** / `ap-southeast-2`) if listed, otherwise the default.
5. Database password: generate one and store it in a password manager. The app never uses it.
6. Plan: **Free**. Create the project and wait until the API URL is ready (~1–2 minutes).

Later, on EAS: `eas integrations:supabase:connect` is optional; pasting the two public keys into EAS env also works.

### 2. Copy the public API keys

Dashboard → **Project Settings → API**:

- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon public** (sometimes labelled publishable) → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Never put the **service_role** key in the app, EAS public env, or git.

```bash
cp .env.example .env.local
# paste URL + anon key, save, restart Expo
```

### 3. Apply the migrations

SQL lives in `supabase/migrations/`. Apply **in order**:

1. `20260914120000_init.sql`
2. `20260914140000_phase2.sql`
3. `20260914160000_phase3.sql`
4. `20260914210000_reveal_at.sql`
5. `20260914220000_organiser.sql`
6. `20260915120000_live_rls.sql` — column-level surprise-safe SELECT + `ensure_own_workspace`
7. `20260915180000_giver_status_rpc.sql` — giver status composite + `giftdecider.giver_rpc`
8. `20260916140000_giver_list_refresh.sql` — volatile `get_shared_wishlist_items`
9. `20260918090000_giver_social_foundations.sql` — handle search, `giver_people` pins, member `status`, requests
10. `20260918100000_item_giver_comments.sql` — giver-only item comments (owner deny)
11. `20260918110000_taste_tags_search.sql` — `taste_tags` + strict `search_wishlist_items`

**Dashboard:** SQL Editor → paste each file → Run. Wait for success before the next file.

**CLI (local):**

```bash
npx supabase start
npx supabase db reset
npx supabase status
```

Put the API URL + anon key from `status` into `.env.local`. A physical phone cannot reach `127.0.0.1`; use your computer’s LAN IP instead.

**CLI (hosted):**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### What the migrations create

- `profiles` — handle, display name, locale (`en-AU` default)
- `wishlists` — one default list per signup, plus `share_token`
- `occasions` — named packs under a wishlist, each with a `share_token`
- `wishlist_items` — image, title, notes, source, buy URL, vibe tags, `item_kind`, size hint, target amount, occasion, no-substitution, giver-only status / group-gift / `buy_url_dead`, `funded_at`, `reveal_at` (calendar date), organiser name, pay instructions, delivery method/note, `ready_to_buy_notified_at`
- `item_pledges` — honour-system chip-ins (givers via RPC). **Owners have no SELECT.** After `reveal_at` (not merely `funded_at`), `list_owned_revealed_contributors` returns **names only** (Anonymous if blank) — never amounts
- `organiser_notices` — giver-only “Funded — time to buy” rows (same surprise-safe rule as pledges)
- `wishlist_members` — email invites + giver access requests (`status`: active / pending_request / declined / revoked / blocked)
- `giver_people` — private “People I buy for” pins (pin is free; opening items still needs accept or a share/public link)
- `giver_blocks` / `giver_email_invites` / `giver_social_rate_events` — block + outbound email stub + rate limits
- `item_giver_comments` — giver-only item notes. **Owners have no SELECT** (no count, no teaser)
- `link_previews` — URL cache for the paste flow
- Storage bucket `wishlist-images` (`{user_id}/...`)
- Trigger: new `auth.users` row → profile + empty wishlist; `ensure_own_workspace()` recovers that if the trigger missed
- RLS: owner catalog CRUD (no SELECT on reserve / purchased / funded / heal / organiser / `reveal_at` columns); accepted **active** members may UPDATE reserve fields only; pledges, organiser notices, and giver comments hidden from owners; givers use share-token RPCs
- Owner view: `owner_wishlist_items` (catalog columns only)
- RPCs for anonymous givers: `get_shared_wishlist`, `get_shared_wishlist_items`, `set_shared_item_status`, `set_shared_item_group_gift` (requires reveal date when enabling; optional organiser + PayID), `set_shared_item_reveal_at`, `set_shared_item_organiser`, `set_shared_item_pay_instructions`, `set_shared_item_delivery`, `list_shared_item_pledges`, `list_shared_organiser_notices`, `add_shared_item_pledge`, `mark_shared_item_funded`, `set_shared_item_link_dead` (wishlist **or** occasion token), `search_shared_wishlist_items` (id + rank only — no tags)
- Authenticated giver RPCs: `search_profiles_by_handle`, `request_giver_access`, `respond_giver_access`, `invite_giver_by_email`, `list_giver_people`, `claim_share_as_giver`, `list_item_giver_comments` / `post_item_giver_comment` (not owner, not anon), `search_wishlist_items`
- Owner RPC: `list_owned_revealed_contributors` (authenticated owner, group gifts on/after `reveal_at` only — not merely funded)
- `profiles.discoverability` (`private` \| `handle`) and `profiles.taste_tags` (owner CRUD; givers only via search WHERE)

### 4. Auth settings

Supabase → Authentication → URL Configuration:

- Redirect URLs (add each that you use):
  - `giftdecider://auth/callback`
  - `http://localhost:8081/auth/callback`
  - `http://127.0.0.1:8081/auth/callback`
  - your EAS / production web origin + `/auth/callback`
  - Vercel Production (root path): `https://YOUR-APP.vercel.app/auth/callback`
  - Vercel Preview origin + `/auth/callback` if you test magic-link on preview deploys
  - GitHub Pages if you ever point Pages at a live project: `https://wombat737.github.io/Gift-decider/auth/callback` (Pages itself stays Explore demo — no keys)
- Site URL: `http://localhost:8081` while developing; later your Vercel Production origin
- Enable **Email** magic link (on by default). Confirmations can stay on for the free project.

The app calls `signInWithOtp` and `Linking.createURL('auth/callback')`, so Expo Go uses `exp://…/--/auth/callback` and a dev/production build uses `giftdecider://auth/callback`. Add whichever you actually open.

### 5. Preview Edge Function (buy-link autofill)

Wombat: Add item pastes a shop URL → the app calls this function → Open Graph / meta / JSON-LD Product fills photo, title, and a short note. The user always edits before Pin. Fetch failure never blocks Pin.

```bash
npx supabase functions serve preview-url --no-verify-jwt
# or, on the hosted project:
npx supabase functions deploy preview-url
```

Redeploy after this change — the old function returned a fake picsum stub for every URL.

`POST { "url": "https://www.kmart.com.au/..." }` fetches the public page (4s timeout), parses `og:title` / `og:image` / description, prefers AU hosts (Amazon AU, Kmart, Target AU, Big W, …), and returns `{ url, title, description, image_url, provider, stub: false }`.

Rules:

- **http(s) only.** Rejects credentials, localhost, and private / metadata hosts.
- **No Instagram scrape.** `instagram.com` / `instagr.am` still return the existing paste-flow stub. No Meta OAuth, no Saves API.
- **No login walls.** 401/403 → empty fields, not an error.
- **No new migration.** Successful fills can cache in existing `link_previews`.
- Explore demo (no secrets) cannot fetch remote shops (CORS). It may guess a title from the URL path and shows “Couldn’t grab a photo — add one”. Pin still works.

Curl (JWT verify is off):

```bash
curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/preview-url" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.kmart.com.au/"}'
```

### 6. Optional substitute improv function

```bash
npx supabase functions serve improv-substitutes --no-verify-jwt
# or
npx supabase functions deploy improv-substitutes
```

Without `OPENAI_API_KEY` in the function env it returns `{ "source": "stub", "suggestions": [] }` and the app uses its local catalog. If the function is undeployed, the client also falls back to that catalog.

### 7. Dead-link heal function (stub)

```bash
npx supabase functions serve heal-link --no-verify-jwt
# or
npx supabase functions deploy heal-link
```

`POST { "url", "title", "tags", "no_substitution" }` returns `{ health, source, alternatives: [] }`. Known-bad demo URLs and malformed URLs are dead without a network call. Optional HEAD/GET marks 404/410. **No LLM key.** The app still builds 1–3 AU alternatives locally unless `no_substitution` is set. Explore demo never calls the function.

### 8. Organiser ready-to-buy email (stub)

```bash
npx supabase functions serve notify-organiser-ready-to-buy --no-verify-jwt
# or
npx supabase functions deploy notify-organiser-ready-to-buy
```

Demo never needs keys: the giver UI shows the would-be email and the browser console logs it. If `RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN` are set on the function, it sends **one** email when a group gift hits Ready to buy. Recipient is `organiser_email` on the request, or function env `NOTIFY_TO_EMAIL`. Push notifications are out of scope (next).

## Giver social (A → B → C)

Share links stay primary. This adds handle search + email invite (no global browse), giver-only item comments, and recipient taste tags that givers **search** (no chips).

**Already on a hosted project?** SQL Editor → run in order (after `giver_list_refresh`):

9. `supabase/migrations/20260918090000_giver_social_foundations.sql`
10. `supabase/migrations/20260918100000_item_giver_comments.sql`
11. `supabase/migrations/20260918110000_taste_tags_search.sql`

Locks in this ship:

- Pin is free (`giver_people`). Opening/viewing items needs accept **or** an existing share-token / public-link path.
- Handle search + email invite only. No display-name search, no people directory.
- Comments: item-only; owner JWT cannot read (RLS deny + no UI/count); logged-in active giver to post; token anon can still view/reserve.
- Tags: recipient editor (chips for edit). Giver list: search field only, **strict mode** (RPC returns `id` + `rank`, never `taste_tags` / `tags`).
- Givers remain Free. Sticky giver footer, keyboard, dd/mm/yyyy, live status, chip-in/reveal, flair pass are unchanged.

**Deferred (Slice D):** notify other givers of comments, display-name search opt-in, controlled tag vocab, contacts upload, comment mute, SPF mail for invites.

Explore demo: Wishlist header → **People** (Mum waiting, Priya open) and **Requests** (Alex). `/g/demo` has a search field (`linen`) and mug **Giver notes**. Owner `/item/demo-mug` has no comment section.

## Screens

| Route | Who | What |
| --- | --- | --- |
| `/` | Anyone | Redirects to sign-in or `/wishlist` |
| `/sign-in` | Anyone | Live: magic-link primary. No env: **Explore demo** primary. Apple/Google placeholders |
| `/wishlist` | Recipient | Photo grid + occasion filter (no reserve/purchased/pledges). **From the group** only on/after the reveal date |
| `/add` | Recipient | Paste a buy URL to draft photo + title + notes, then edit and pin. Vibe board, occasion, lock, optional target $ |
| `/paste` | Recipient | Paste a public Instagram URL → OG/meta draft → edit title/photo → pin. Honest miss if Instagram hides it |
| `/item/[id]` | Recipient | Item detail + edit vibes. Group reveal (names) on/after the reveal date |
| `/share` | Recipient | Whole-list + occasion **Copy invite** (mate-ready text) |
| `/settings` | Recipient | Live profile (name / handle / discoverability / taste tags), privacy link, account-deletion mailto stub, sign out |
| `/people` | Giver (signed in) | People I buy for — pin, handle search, email invite stub, paste share link |
| `/requests` | Recipient | Accept / Decline / Block giver access requests |
| `/privacy` | Anyone | Store-listing privacy stub (works on `/Gift-decider/privacy`) |
| `/g/[token]` | Giver | Read-only list **with** Taken/Bought (no names), search field (no tag chips), confidence, **Link may be broken** badge, **Funded — time to buy** banner |
| `/g/[token]/[itemId]` | Giver | Soft lock, group pledges, organiser / PayID / delivery, reveal date, mark funded, dead-link heal sheet, AU buy helpers, giver-only comments (logged-in) |
| `/auth/callback` | Auth | Completes the magic-link session, then `/wishlist` |

## What’s stubbed (on purpose)

- **Instagram** — paste a public URL. Same public OG/meta fetch as buy links. No Meta OAuth, no Saves API, no unofficial scrapers. If the page hides metadata, fields stay empty — never a demo stub photo
- **`preview-url`** — live Open Graph / meta fetch for shop buy links and public Instagram pages. No unofficial Instagram APIs. Explore demo cannot fetch remote shops (CORS) — path-title fallback for buy links; Instagram paste stays honestly empty
- **`heal-link` / `improv-substitutes`** — stubs. The app uses in-app fallbacks when env vars or the function are missing
- **Apple / Google Sign-In** — buttons that explain they are placeholders. **Email magic link is live** once URL + anon key are set
- **Email invites** — inserts `wishlist_members` / `giver_email_invites` when Supabase is configured; does not send mail
- **Giver comments notify** — none in MVP (Slice D)
- **Camera / Storage upload** — add-item takes an image URL; bucket + RLS are ready
- **AI matches / dead-link heal** — `healLink` heuristic catalog + optional `heal-link` HEAD stub. No OpenAI/Anthropic key. `HealLinkLlm` is the future plug-in; demo is offline-safe
- **Group-gift reveal to recipient** — names / Anonymous on/after the reveal date, not when funded. No Stripe
- **Organiser notify** — in-app banner + `notify-organiser-ready-to-buy` email stub (Resend/Postmark optional). **Push notifications are next**
- **Account deletion** — Settings mailto stub until a backend mailer exists
- **Analytics** — no-op hook; optional console traces. No paid account
- **Real payments** — honour-system pledges + PayID/BSB text only. No Stripe. Gift Decider holds no money
- **Store submit** — EAS profiles are ready; Apple/Play upload needs Wombat’s accounts
- **Affiliates** — AU helpers are plain search URLs (Amazon AU, Kmart, Target AU, Big W)

## Soft launch checklist

Do this when you are ready for 10–20 mates on device. **Do not** pay Apple/Play from this PR — that is Wombat’s accounts.

### 1. Accounts

- [ ] **Apple Developer** ($99/year) — enroll at [developer.apple.com](https://developer.apple.com). You’ll need this for TestFlight.
- [ ] **Google Play Console** ($25 one-off) — [play.google.com/console](https://play.google.com/console). Internal testing track does not require a public listing.
- [ ] **Expo / EAS** — `npm i -g eas-cli` then `eas login`. `eas init` in this repo (creates the EAS project; slug is `gift-decider`).
- [ ] **Supabase production project** — [database.new](https://database.new), apply migrations in order (including `live_rls`), set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` on EAS (`eas env:create --name EXPO_PUBLIC_SUPABASE_URL --environment production` and the same for the anon key) **and** on Vercel (Production + Preview) for the phone web path. Optional: `eas integrations:supabase:connect`. GitHub Pages should **not** get these secrets — it stays Explore demo.
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

**Fastest (no stores):** send https://wombat737.github.io/Gift-decider/ plus a Birthday or Housewarming giver link. Phone browser. No install. **Live magic-link:** Vercel URL from [Phone / Vercel live path](#phone--vercel-live-path).

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
src/lib/                 Env, types, confidence, AU buy URLs, heal-link contract, substitutes, analytics stub, demo store
supabase/migrations/     Schema + RLS (init through live_rls, giver status, giver social A/B/C)
supabase/functions/      preview-url (OG buy-link fill), heal-link stub, optional improv-substitutes, notify-organiser-ready-to-buy stub
```

## Scripts

```bash
npx expo start          # dev server
npx expo start --web
npx tsc --noEmit        # types
npm test                # surprise-safe + live RLS contract + env switch (node:test)
npm run export:web      # production SPA → dist/ (root path; Vercel uses the same export)
npm run deploy          # GitHub Pages (subpath /Gift-decider)
```
