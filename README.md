# Gift Decider

Mobile wishlist app for gift-givers who need to pick from a recipient’s **living photo wishlist**.

- Recipients curate photos + notes + an optional buy URL
- Givers open a shared read-only link and can reserve or mark purchased
- Instagram v1: paste a public post URL → **preview stub** → pin as an item
- AI matches are **out of this scaffold** (Phase 3)

This repo is a thrifty **Expo + Supabase** starter: screens navigate, schema + RLS exist, auth and Instagram are stubbed where production work still has to happen.

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

If `.env.local` still has placeholders, the app starts in **demo mode**. Tap **Explore demo** on the sign-in screen. Sample gifts load in memory; paste-URL uses an in-app stub; share token is `demo` (`/g/demo`).

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

Both Supabase values are meant to be public. **RLS is what keeps data private** — apply the migration before pointing the app at a live project.

## Supabase

### 1. Create a project

[database.new](https://database.new) (or `eas integrations:supabase:connect` once you are on EAS).

### 2. Apply the migration

SQL lives in `supabase/migrations/20260914120000_init.sql`.

**Dashboard:** SQL Editor → paste the file → run.

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

### What the migration creates

- `profiles` — handle, display name, locale
- `wishlists` — one default list per signup, plus `share_token`
- `wishlist_items` — image path/url, title, notes, source, buy URL, tags, no-substitution, status, reserved_by
- `wishlist_members` — email invites
- `link_previews` — URL cache for the paste flow
- Storage bucket `wishlist-images` (`{user_id}/...`)
- Trigger: new `auth.users` row → profile + empty wishlist
- RLS: owner full CRUD; accepted members SELECT + reserve/purchased updates
- RPCs for anonymous givers: `get_shared_wishlist`, `get_shared_wishlist_items`, `set_shared_item_status`

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

## Screens

| Route | Who | What |
| --- | --- | --- |
| `/` | Anyone | Redirects to sign-in or `/wishlist` |
| `/sign-in` | Anyone | Magic link + Apple/Google placeholders + Explore demo |
| `/wishlist` | Recipient | Wishlist photo grid |
| `/add` | Recipient | Manual item |
| `/paste` | Recipient | Paste Instagram URL → stub preview → pin |
| `/item/[id]` | Recipient | Item detail |
| `/share` | Recipient | Copy share link, stub email invite |
| `/g/[token]` | Giver | Read-only list |
| `/g/[token]/[itemId]` | Giver | Reserve / purchased |
| `/auth/callback` | Auth | Magic-link landing stub |

## What’s stubbed (on purpose)

- **Instagram** — paste URL only. No Meta OAuth, no Saves API, no scrapers
- **`preview-url`** — returns sample image + caption
- **Apple / Google Sign-In** — buttons that explain they are placeholders
- **Email invites** — inserts `wishlist_members` when Supabase is configured; does not send mail
- **Camera / Storage upload** — add-item takes an image URL; bucket + RLS are ready
- **AI matches** — Phase 3, not in this repo
- **Affiliates** — buy URL is a plain field

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
src/lib/                 Env, types, Supabase client
supabase/migrations/     Schema + RLS
supabase/functions/      preview-url stub
```

## Scripts

```bash
npx expo start          # dev server
npx expo start --web
npx tsc --noEmit        # types
```
