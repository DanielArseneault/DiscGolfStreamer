# Disc Golf Pilot

A PWA that lets camera operators on a disc golf course collaboratively control a livestream displayed on a big screen TV at the tournament tent — no central director required.

Built for a national disc golf tournament in Dieppe, NB, Canada.

## How it works

Camera operators carry iPhones + a Starlink backpack. Each operator runs this PWA and streams via RTMP to Mux. When an operator wants the live feed, they request it — a 5-second vote goes out to all connected operators, and if nobody objects, the viewer page switches to their stream automatically via Supabase Realtime.

```
[iPhone 1 - Camera Op] ──RTMP──► [Mux Input 1] ──┐
                                                    ├──► HLS ──► [Tent Laptop] ──► [TV]
[iPhone 2 - Camera Op] ──RTMP──► [Mux Input 2] ──┘
        ▲▼ Supabase Realtime
        voting · overlays · scores · hole state
```

## Tech stack

- **Frontend** — React + TypeScript + Tailwind CSS v4, Vite
- **Database + Realtime** — Supabase (Postgres + Supabase Realtime)
- **Video** — Mux (RTMP ingest, HLS output, asset storage)
- **PWA** — vite-plugin-pwa, works on iPhone Safari

## Pages

| Route | Who uses it | Purpose |
|---|---|---|
| `/operator` | Camera ops (iPhone) | Register name, join session |
| `/operator/live` | Camera ops (iPhone) | Take feed, select player, shot count, hole flow |
| `/admin` | Tournament admin | Manage courses, layouts, holes, rounds, players |
| `/admin/stream` | Tournament admin | Control HLS override URL, test stream |
| `/viewer` | Tent laptop → TV | Fullscreen HLS player + realtime overlays |

## Getting started

### 1. Clone and install

```bash
git clone <repo>
cd DiscGolfStreamer
npm install
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Run the following to add the stream override column:
   ```sql
   alter table stream_state add column if not exists override_hls_url text;
   ```

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MUX_TOKEN_ID=your-token-id        # optional for testing
VITE_MUX_TOKEN_SECRET=your-token-secret  # optional for testing
```

### 4. Run

```bash
npm run dev
```

## Mux setup (for live streaming)

For testing, use **Admin → Stream → Play Test Stream** — no Mux account needed.

For production:

1. Upgrade Mux to pay-as-you-go (add a credit card — no monthly fee)
2. Create two Live Streams in the Mux dashboard (one per camera operator)
   - Latency: Low
   - Reconnect window: 300s
3. For each operator in Supabase → `operators` table, set:
   - `mux_stream_id` — the Mux live stream ID
   - `mux_stream_key` — give this to the operator for their RTMP app
   - `mux_playback_id` — the HLS playback ID

## Voting system

Any operator can request the live feed at any time. A banner appears on all other operators' screens with a 5-second countdown. If nobody objects, the vote auto-approves and the viewer switches to that operator's stream. Any operator can tap "Object" to block the switch.

## Between-hole flow

1. Operator taps **Hole Done** → vote passes → viewer switches to pre-loaded hole media
2. Viewer overlay shows next hole info + leaderboard
3. Operator taps **Ready to Stream** at the next tee → vote passes → live feed resumes

## Database schema

| Table | Purpose |
|---|---|
| `courses` | Course name + location |
| `layouts` | Named layouts per course (e.g. Pro, Recreational) |
| `holes` | Hole number, par, distance, optional Mux asset for between-hole media |
| `rounds` | A round tied to a layout, with status (pending/active/completed) |
| `players` | Up to 4 players per round |
| `scores` | Strokes per player per hole |
| `stream_state` | Singleton row — current mode, active feed, overlays, hole, shot count |
| `operators` | Camera operators with their Mux stream credentials |
| `votes` | Active vote with expiry |
| `vote_objections` | Objections cast against a vote |
