# CarTalk — Setup Guide

This guide takes you from download to a working system, and lists what you must
configure before shipping a product built on CarTalk.

> Please also read **[DISCLAIMER.md](DISCLAIMER.md)** (safety & legal) and the
> root **LICENSE**.

## What's included

| Part | What it is | Runs on |
|------|------------|---------|
| `server/` | Display server + full-screen web display page | The car screen device (Raspberry Pi, tablet, mini-PC) |
| `mobile/` | React Native (Expo) controller app | The driver's phone |
| `cloud/`  | Optional live-map relay + web map | A host/PC/VPS (or your LAN, for testing) |
| `shared/`, `docs/` | Wire protocol + documentation | — |

Everything is source you build yourself. There is no license key or activation.

## Requirements

- **Node.js 18+** (for `server/` and `cloud/`).
- **A browser** on the screen device (Chromium-based recommended; required for
  the car-screen voice input).
- For the mobile app: **Node + Expo**; and, for on-device voice/GPS/motion, the
  ability to make a **custom dev build** (Android Studio and/or Xcode).
- A **local Wi-Fi network** the phone and screen device share (a car travel
  router or the screen device as a hotspot works well).

## 1. Screen (display server)

```bash
cd server
npm install
npm start          # prints http://<ip>:8080
```

Open the printed URL on the screen device's browser, full-screen it, and note
the device's LAN IP. Configurable via env: `PORT`, `HOST`, `HEARTBEAT_MS`.

## 2. Controller app (phone)

```bash
cd mobile
npm install
npm start          # scan QR with Expo Go, or press a / i
```

In the app: **⚙︎ Settings → Connection**, enter `ws://<screen-ip>:8080`, Save.
When the header shows **Connected**, you're live.

### On-device voice, GPS, and motion (dev build)

Phone-mic voice (`@react-native-voice/voice`), the speed-aware lock
(`expo-location`), and hard-brake detection (`expo-sensors`) are **native
modules** that do not run in Expo Go. Make a dev/production build to enable them:

```bash
cd mobile
npx expo run:android      # or: npx expo run:ios
# or use EAS Build for cloud builds
```

Without a native build the app still works fully; voice is hidden and the drive
lock assumes "moving" (safe default). The **car screen's** own voice input needs
no build — it uses the browser speech API.

## 3. Live map (optional)

```bash
cd cloud
npm install
npm start          # live map + relay on http://<host>:9090
```

In the app: **Settings → Live map sharing**, toggle on, enter
`ws://<relay-host>:9090`. Open the relay URL in a browser to watch pins appear.

### Configure a map-tile provider (required for commercial use)

The default OpenStreetMap public tile server is **not licensed for commercial or
heavy use**. Before production, set your own provider (e.g. MapTiler, Mapbox,
Thunderforest) via environment variables — no code change needed:

```bash
TILE_URL="https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=YOUR_KEY" \
TILE_ATTRIBUTION="© MapTiler © OpenStreetMap contributors" \
npm start
```

The map page reads these at runtime from `/config.json`, so your key stays in
the server environment, not in the committed source.

## Deploying the relay for real users

`npm start` is fine for testing on your machine/LAN. For a public, multi-car
map, host `cloud/` on a VPS/container behind HTTPS (use `wss://` in the app),
put it behind a reverse proxy, and set your `TILE_URL`. The relay keeps only
in-memory, coarsened, anonymous state (see DISCLAIMER for privacy duties).

---

## Pre-sale checklist (must configure before you ship)

- [ ] Set a licensed **`TILE_URL`** / `TILE_ATTRIBUTION` (don't ship on OSM's
      public server).
- [ ] Replace names, branding, app id (`mobile/app.json` → `android.package`,
      slug, display name) and any placeholder copyright in `LICENSE`.
- [ ] Decide and document your **support & refund** policy.
- [ ] Keep **`THIRD-PARTY-NOTICES.md`** in the package.
- [ ] Include **`docs/DISCLAIMER.md`** and surface the safety/legal points to
      buyers; don't claim road-legality.
- [ ] Test a real **dev build** on Android and/or iOS hardware.
- [ ] If offering the live map as a hosted service, publish a **privacy policy**
      and obtain user consent for location sharing.
