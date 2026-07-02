# CarTalk WebSocket Protocol

All communication happens over a single WebSocket connection on the local
network. Every frame is a JSON object with a `type` field. The server is
authoritative: it owns the current message, the schedule queue, and the config,
and it broadcasts every state change to the relevant clients.

The canonical constants live in [`shared/protocol.js`](../shared/protocol.js)
(server) and [`mobile/src/protocol.js`](../mobile/src/protocol.js) (app). Keep
those two files in sync.

## Roles

A client declares its role in the first frame it sends:

- **`display`** — the car's rear screen. Receives `display` frames and renders
  them. Usually one, but any number are supported (they mirror each other).
- **`controller`** — the driver's phone app. Sends messages and config changes.

## Domain objects

### Message

```jsonc
{
  "id": "m_ab12cd34",        // server-assigned if omitted
  "text": "THANKS",          // sanitized, uppercased on screen, <= config.maxLength
  "emoji": "🙏",             // optional decoration
  "animation": "fade",       // none | fade | scroll | pulse | blink
  "durationMs": 0,           // 0 = use server autoClearMs; >0 = show this long
  "priority": "normal",      // normal | high (high can't be interrupted by normal)
  "createdAt": 1700000000000
}
```

### Config

```jsonc
{
  "autoClearMs": 8000,       // blank the screen this long after a message (0 = never)
  "profanityFilter": true,   // mask flagged words in non-preset messages
  "maxLength": 60,           // hard cap on message text length
  "minFontPx": 48,           // display never renders text smaller than this
  "freeTypeEnabled": true,   // when false, only presets are accepted
  "brightness": 1            // 0.1–1 display dimmer
}
```

## Client → Server

| `type`        | Payload                        | Effect |
|---------------|--------------------------------|--------|
| `hello`       | `{ role, name? }`              | Identify; server replies `welcome`. |
| `send`        | `{ message, isPreset? }`       | Show immediately (respects priority + free-type policy). |
| `clear`       | `{}`                           | Blank the screen now. |
| `set_config`  | `{ config: Partial<Config> }`  | Merge config (values are clamped); broadcast. |
| `enqueue`     | `{ message }`                  | Add to the schedule queue (auto-shows if screen is idle). |
| `dequeue`     | `{ id }`                       | Remove a queued message. |
| `clear_queue` | `{}`                           | Empty the queue. |
| `ping`        | `{}`                           | Keep-alive; server replies `pong`. |

## Server → Client

| `type`     | Payload                                       | Sent to |
|------------|-----------------------------------------------|---------|
| `welcome`  | `{ clientId, config, current, queue, peers }` | the connecting client |
| `display`  | `{ message: Message \| null }`                | displays (`null` = blank) |
| `config`   | `{ config }`                                  | everyone |
| `queue`    | `{ queue: Message[] }`                        | everyone |
| `peers`    | `{ peers: { displays, controllers } }`        | everyone |
| `error`    | `{ message }`                                 | the offending client |
| `pong`     | `{}`                                          | the pinging client |

## Rules enforced by the server

- **Sanitization** — every inbound message is length-capped, whitespace-collapsed,
  and (unless it's a preset) run through the profanity filter before it can
  reach a screen.
- **Free-type lock** — when `freeTypeEnabled` is false, `send`/`enqueue` of
  custom text is rejected with an `error`; presets still work.
- **Priority** — a `high` priority message on screen cannot be replaced by a
  `normal` one.
- **Auto-clear & queue** — when a message's time is up, the server promotes the
  next queued message, or blanks the screen if the queue is empty.
