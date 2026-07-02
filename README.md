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

## Features

- **Preset quick messages** — one-tap "THANKS!", "SORRY!", "GO AHEAD", "BABY ON
  BOARD", and more, each with an emoji and animation.
- **Custom + voice messages** — type or dictate; review before sending.
- **Animations** — `fade`, `pulse`, `blink`, and marquee `scroll` for long text.
- **Scheduling** — queue several messages; the screen advances automatically as
  each one auto-clears.
- **Safety controls** — auto-clear timeout, profanity filter, minimum font size,
  brightness, max length, and a "presets only" lock that disables free typing.
- **Resilient** — both clients auto-reconnect; the server heartbeats and prunes
  dead links; the display keeps the screen awake via the Wake Lock API.

## Development

- Protocol is defined once in `shared/protocol.js` (server) and mirrored in
  `mobile/src/protocol.js` (app) — change both together.
- The server is transport-only; all rules live in `server/src/messageManager.js`.
- No build step for the display page — it's plain static HTML/CSS/JS.

## Roadmap ideas

- Bluetooth transport as a Wi-Fi-free fallback.
- Speed-aware locking via the phone's GPS.
- Cloud relay mode for remote screens.
- Custom preset editor and per-driver profiles.

## License

MIT — see [`LICENSE`](LICENSE).
