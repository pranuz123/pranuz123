# 🚗💬 CarSign

Show messages on a screen mounted in the back of your car — say "THANKS!",
"SORRY!", or a quick custom note to the driver behind you — controlled from a
phone app over local Wi-Fi, with voice input from either the phone or the car.

> ⚠️ **Drive safely.** CarSign is built for low-distraction use: big one-tap
> presets, voice dictation, and auto-clearing messages. Compose while stopped,
> or let a passenger drive the screen. Follow your local laws on in-vehicle
> displays.

## What's in here

| Path        | What it is |
|-------------|------------|
| `server/`   | Node.js server that runs on the screen device (e.g. a Raspberry Pi). Serves the full-screen **display web page** and relays messages over WebSocket. |
| `server/public/` | The display page itself — huge high-contrast text, animations, and optional car-mic voice input via the browser's Web Speech API. |
| `mobile/`   | The **controller app** — React Native (Expo). Presets, custom text, phone-mic voice, scheduling, and safety settings. |
| `cloud/`    | Optional **live-map relay** + web map. Cars publish signs with GPS; a live map shows everyone's signs and hazards in real time. Off by default. |
| `shared/`   | The wire protocol, shared as the single source of truth. |
| `docs/`     | [Protocol reference](docs/PROTOCOL.md). |

## How it fits together

```
┌─────────────────┐   Wi-Fi / WebSocket   ┌──────────────────────────┐
│  Phone app       │ ───── messages ─────▶ │  Screen device (Pi)       │
│  (React Native)  │ ◀──── state ───────── │  ├─ Node server (relay)   │
│  presets, voice, │                       │  └─ Browser display page  │
│  queue, settings │                       │      big text + car mic   │
└─────────────────┘                        └──────────────────────────┘
```

The server holds all state (current message, queue, config) and broadcasts
changes, so multiple phones and multiple screens stay in sync. See
[`docs/PROTOCOL.md`](docs/PROTOCOL.md).

## Hardware assumptions

- A **screen device** in the rear of the car that can run a browser in kiosk
  mode and reach the network — a Raspberry Pi + HDMI display, an Android
  tablet, or similar.
- A **local network** the phone and screen device share. In a car this is
  typically a small travel router or the Pi acting as a Wi-Fi hotspot (no
  internet required).
- **Microphones**: the phone's mic (used by the app) and/or a mic on the screen
  device (used by the display page's browser voice input).

## Quick start

### 1. Run the display server (on the screen device)

```bash
cd server
npm install
npm start
# → CarSign server listening on http://0.0.0.0:8080
```

Open the printed URL in the screen device's browser and put it in full-screen /
kiosk mode. It shows the idle logo until a message arrives. Note the device's
LAN IP (e.g. `192.168.4.1`) — you'll enter `ws://192.168.4.1:8080` in the app.

Environment overrides: `PORT` (default `8080`), `HOST`, `HEARTBEAT_MS`.

### 2. Run the controller app (on your phone)

```bash
cd mobile
npm install
npm start          # then press a for Android / i for iOS, or scan the QR code
```

In the app, tap **⚙︎ Settings**, enter the server address (`ws://<screen-ip>:8080`),
and Save. Once the header shows **Connected**, tap a preset or compose a message.

> **Voice on the phone** uses `@react-native-voice/voice`, which needs a custom
> **dev build** (`npx expo run:android` / `run:ios` or EAS Build) — it does not
> run in Expo Go. Without it, the app still works fully; the mic button is just
> hidden and you type instead. The **car screen's** voice input needs no build
> — it uses the browser's built-in speech recognition (Chromium-based browsers).

## Live map (optional, opt-in)

Turn isolated car signs into a real-time network. When **live-map sharing** is
enabled in the app, the sign currently on your screen is published — with your
GPS location — to the `cloud/` relay, and appears as a live pin on a shared web
map alongside every other sharing car. Hazards flash red; messages are amber;
face/emoji reactions are blue. Pins expire on a timer so the map always reflects
what's happening *now*.

```bash
cd cloud
npm install
npm start            # → live map at http://<host>:9090, relay on the same port
```

Then in the app: **Settings → Live map sharing**, flip it on and enter
`ws://<relay-host>:9090`. Open the relay URL in any browser to watch signs
appear live.

- **Opt-in & private by default** — sharing is off unless you turn it on, and
  nothing is published without a location fix. The relay **coarsens coordinates**
  (~11 m) and stores **no identity** — it's a real-time relay, not a database.
- **Self-contained** — Leaflet is vendored locally (`cloud/public/vendor`), so
  the map needs no CDN; only the street tiles require internet.
- **Local-first** — you can run the relay on your own machine/LAN to try the
  whole feature without any hosting. Point it at a public host when you're ready
  to go wide.

## Features

The phone app is the full control center — messages, presets, scheduling, and
every setting live there and push live to the screen. The server on the screen
device just relays and enforces the rules.

### Flagship — makes it a safety device, not a toy

- **Speed-aware safety lock** — the phone's GPS speed auto-adjusts what you can
  do: **parked** = full control (type/voice/presets), **moving** = presets +
  hands-free voice only, **fast** = presets only. A **Passenger mode** toggle
  unlocks full control when someone else is operating the app. Speed thresholds
  are configurable.
- **Auto-reactions** — the motion sensor detects a hard brake and automatically
  flashes **"SORRY!"** to the car behind — zero taps.
- **Emergency & hazard** — one-tap **HELP / CALL 911 / MEDICAL / BABY IN CAR /
  HAZARD AHEAD**. These are high-priority: they override the screen, can't be
  bumped by a normal message, and stay up until you clear them.

### Faces & reactions (the attention-grabber)

- **Animated living faces** — tap a face and the rear screen shows a big,
  blinking, expressive character drawn in pure CSS: happy, laughing, wink, heart
  eyes, cool (shades), whoa, sad, grr, sleepy. No image assets — runs on any
  kiosk browser.
- **Big emoji gallery** — one-tap giant 👍 ❤️ 🎉 🙏 … blown up full-screen.
- **Custom emoji** — attach any emoji from your keyboard to a composed message.

### Core

- **Preset quick messages** — one-tap "THANKS!", "GO AHEAD", "BABY ON BOARD",
  and more, each with an emoji and animation.
- **Custom + voice messages** — type or dictate; review before sending.
- **Animations** — `fade`, `pulse`, `blink`, and marquee `scroll` for long text.
- **Scheduling** — queue several messages; the screen advances automatically as
  each one auto-clears.
- **Safety controls** — auto-clear timeout, profanity filter, minimum font size,
  brightness, max length, and a "presets only" lock that disables free typing.
- **Resilient** — both clients auto-reconnect; the server heartbeats and prunes
  dead links; the display keeps the screen awake via the Wake Lock API.

> The driving lock and auto-reaction use `expo-location` and `expo-sensors`,
> which run in Expo Go. If location permission is denied, the app assumes
> "moving" and stays in the safer restricted mode. Hard-brake detection is a
> motion-sensor heuristic — tune the thresholds in Settings for your mount.

## Development

- Protocol is defined once in `shared/protocol.js` (server) and mirrored in
  `mobile/src/protocol.js` (app) — change both together.
- The server is transport-only; all rules live in `server/src/messageManager.js`.
- No build step for the display page — it's plain static HTML/CSS/JS.

## Roadmap ideas

- **Universal icon mode + auto-translate** — render messages in the local
  language or pure emoji so there's no language barrier on the road.
- **Hands-free wake word** — "Hey CarSign, say thanks."
- **Watch / CarPlay / Assistant** quick-send so the phone never leaves the mount.
- **OBD-II integration** — mirror real brake/turn signals to the screen.
- Bluetooth transport as a Wi-Fi-free fallback; cloud relay for remote screens.
- Custom preset editor and per-driver profiles.

## Selling / licensing

CarSign is a **commercial product**, not open-source. All original code is the
author's to license; every bundled dependency is under a permissive license that
allows commercial use.

- **License:** proprietary commercial license — see [`LICENSE`](LICENSE). (On a
  marketplace like Gumroad or CodeCanyon, that marketplace's license governs.)
- **Third-party notices:** [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) —
  keep this in any distribution.
- **Buyer setup + pre-sale checklist:** [`docs/SETUP.md`](docs/SETUP.md).
- **Safety & legal disclaimer:** [`docs/DISCLAIMER.md`](docs/DISCLAIMER.md) —
  read before deploying or reselling.

⚠️ Before you ship: configure a **licensed map-tile provider** (`TILE_URL`) —
the default OpenStreetMap public tile server is not for commercial use — and
rebrand the app id / names / copyright. The pre-sale checklist in the setup
guide covers everything.
