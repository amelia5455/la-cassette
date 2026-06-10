# La Cassette

Turn a playlist into a sealed **mixtape gift link**. A sender connects their music
service, picks a playlist, and the app matches each track to the *other* service
**by ISRC** (the recording's unique id) — so the same recording lands on the other
side, not just the same title. The sender labels the tape (title, note, stripe
color, shell icon) and gets a share link. A receiver opens the link, sees a sealed
cassette, connects their service, and the playlist is created in their library.
Unmatched tracks are surfaced honestly, never faked.

Direction is user-selected: **Spotify → Apple Music** or **Apple Music → Spotify**.

Built with **Next.js (App Router) + TypeScript**, deployed on **Vercel**.

---

## Demo mode

The app runs **end-to-end with no credentials**. When a service isn't configured,
it uses mocked playlists and matches (identical to the design prototype), so you
can click through the entire sender → receiver flow locally. Fill in the
environment variables below to switch each service to its real integration.

```bash
npm install
npm run dev          # http://localhost:3000
```

- `/` — sender flow: connect → pick playlist → match by ISRC → label the tape → share link
- `/t/<id>` — receiver flow: sealed cassette → peel → connect → playlist created in library

---

## Architecture

```
app/
  page.tsx                     Sender app (client) — role toggle + sender/receiver preview
  t/[id]/page.tsx              Receiver page (server) — loads tape, renders receiver flow
  t/[id]/opengraph-image.tsx   Per-tape OG image via next/og (ImageResponse)
  globals.css                  Design system, ported verbatim from the prototype
  api/
    spotify/login              OAuth start (sender read / receiver modify scopes)
    spotify/callback           OAuth code exchange → signed session cookie
    spotify/playlists          List the connected user's playlists
    spotify/tracks             Read a playlist's tracks (with ISRCs)
    spotify/create             Receiver: create a Spotify playlist from matched ids
    apple/token                MusicKit developer token (ES256 JWT, signed server-side)
    apple/create               Receiver: create an Apple Music library playlist
    match                      Matching service — resolves source tracks → target by ISRC
    tape                       POST: persist a tape (one key → JSON)
    tape/[id]                  GET: read a tape
    status                     Capability flags + Spotify connection state

components/   Cassette, ShellIcon, DeviceFrame, SenderFlow, ReceiverFlow, ReceiverShell
lib/         config, store (Redis/in-memory), spotify, apple, musickit, match, session, demo
public/      hero.jpg + icons/*.png  (extracted verbatim from the prototype)
```

### How matching works

Source tracks carry an **ISRC**. Matching queries the target service's catalog by
that ISRC:

- **target = Apple Music** → `GET /v1/catalog/{storefront}/songs?filter[isrc]=…`
  (developer token)
- **target = Spotify** → `GET /v1/search?type=track&q=isrc:…`
  (client-credentials token)

A track with no ISRC, or whose ISRC isn't in the target catalog, stays **unmatched**
and is shown as such on the receiver's tracklist. Matches are resolved once at send
time and stored on the tape; the receiver only needs to authorize so the resolved
ids can be added to a new playlist.

### Storage

A tape is one key (`tape:<id>`) → one JSON record. Uses **Upstash Redis** when
configured (the Vercel Marketplace integration injects `KV_REST_API_URL` /
`KV_REST_API_TOKEN`); otherwise falls back to a process-global in-memory map for
local dev. Configure Redis for production.

---

## Configuration

Copy `.env.example` to `.env.local` and fill in what you want to enable. See that
file for the full list. Summary:

| Service | Variables | Where |
|---|---|---|
| Spotify | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | [developer.spotify.com](https://developer.spotify.com/dashboard) — add redirect URI `${BASE_URL}/api/spotify/callback` |
| Apple Music | `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (or `_PATH`), `APPLE_STOREFRONT` | [developer.apple.com](https://developer.apple.com) → Keys → MusicKit (.p8) |
| Storage | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel → Storage → Upstash Redis |
| Session | `SESSION_SECRET` | any long random string |
| Base URL | `NEXT_PUBLIC_BASE_URL` | e.g. `http://localhost:3000`; falls back to `VERCEL_URL` |

---

## Deploy to Vercel

```bash
vercel               # link + preview
vercel --prod        # production
```

Add the environment variables in the Vercel dashboard (or `vercel env add`), add an
Upstash Redis integration from the Marketplace for persistence, and set the Spotify
redirect URI to your deployed `${BASE_URL}/api/spotify/callback`.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
```
