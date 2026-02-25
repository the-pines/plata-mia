# xx-network in Plata Mia

## What we use

The **broadcast** package (`gitlab.com/elixxir/client/v4/broadcast`). One shared channel called `platamiaannouncements`. Everyone on the channel sees every message. Messages are 42 bytes: `[version][R][viewTag][blockHint]`.

## Why broadcast, not DM

Stealth addresses require recipients to scan ALL announcements to find theirs. The sender doesn't know who the recipient is on xx-network — that's the whole point. DM would break this.

## What cMix gives us

Sender anonymity. Nobody can tell who posted an announcement. The mixing happens at the network layer — same protection for broadcast and DM.

## What's NOT hidden (by design)

All channel members see all announcements. The privacy comes from the stealth address crypto (only the recipient can match an announcement to themselves), not from restricting who sees them.

## Messaging models in xx-network

| Model | What it does | Who receives |
|---|---|---|
| **Broadcast** (what we use) | Raw byte payloads to a shared channel | Everyone on the channel |
| **Channels** | Rich messaging (text, reactions, admin) built on top of broadcast | Everyone on the channel |
| **DM** | Point-to-point encrypted messages | Only the specific recipient |

We use broadcast directly because we send fixed 42-byte binary payloads. The `channels` package would add unnecessary protobuf overhead. DM would break the stealth scanning model.

## Privacy breakdown

**Protected by cMix:**
- Sender identity — mixnet hides who posted each announcement
- Content in transit — encrypted with XChaCha20

**By design (not a leak):**
- All channel members see all announcements — required for stealth address scanning
- ViewTag gives recipients a fast 1/256 filter to skip non-matching ones
- Real privacy comes from the stealth address math, not from restricting visibility

## Current status

- SDK: v4.7.2 (latest is v4.8.4, no breaking changes to broadcast API)
- Broadcast package: not deprecated, still the right tool for this use case
- Upgrade when convenient — better gateway timeouts and JSON performance

## Architecture notes

- Single xx-proxy server is a single point of failure
- The server knows when clients poll (timing metadata) — low priority concern
- Future improvement: client-side cMix via xxdk-wasm to remove the centralized relay
