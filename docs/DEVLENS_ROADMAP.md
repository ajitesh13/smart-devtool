# DevLens Roadmap — "100x Better Than Native DevTools"

> Living checklist. Every feature must survive the **"why does this exist?"** test:
> we only build what native Chrome DevTools does *badly* or *not at all*.
> Ticked items are shipped and verified.

## Guiding principle

DevLens is **not** a reimplementation of DevTools. It is the layer native tooling
forgets: cross-signal correlation (network ↔ console ↔ performance), advanced
query/grouping, and daily-usable memory/DOM observability that the intimidating
native Memory tab never made approachable.

---

## Tier 0 — Foundation ✅

- [x] Multi-protocol network capture (Network + WebSocket frames) via CDP
- [x] Query engine — regex / eq / contains / gt / lt / range + negate, AND/OR combinator, multi-key sort, grouping (domain/endpoint/status-class/protocol/method/regex-capture)
- [x] Split / grouped multi-pane view (auto-by-protocol: XHR · Fetch · WS · SSE)
- [x] Console capture + console↔network correlation (hard + heuristic links, confidence tooltip, Settings toggle)
- [x] DevTools-native theming (follows DevTools light/dark, not OS)
- [x] Settings: API key, Claude Code port, exclude patterns, heuristic-link toggle

## Tier 1 — Performance Observability ✅ (user must-have)

- [x] Enable CDP `Performance` domain; poll `Performance.getMetrics` ~1 Hz (`background/perf-interceptor.ts`)
- [x] Live vitals: JS heap used/total, DOM **Nodes**, JSEventListeners, Documents/Frames, LayoutCount, RecalcStyleCount, `ScriptDuration`/`TaskDuration` (CPU proxy via `cpuPercentBetween`)
- [x] Sparkline history (bounded 120-sample ring buffer) + threshold coloring (heap/nodes/listeners rising = red)
- [x] DOM provenance — **live subtree attribution** (`DOM.getDocument` walk → node counts per top-level container, shows which subtree is growing)
- [x] DOM provenance — **on-demand detached-node leak scan** (`DOM.getDetachedDomNodes` → detached DOM trees still retained by JS, grouped by container)
- [x] Real Performance tab replacing the "Phase 2" placeholder (`components/performance/PerformancePanel.tsx`)
- [x] Remove per-call AI "Explain request" wiring (kept `anthropic-client.ts` / `ai.store` for later macro-AI)

## Tier 2 — Network Superpowers ✅

- [x] Response/status **override + mocking** — force status code / body / delay via CDP `Fetch` domain (`background/mock-interceptor.ts`, `Mocks` tab) *(native cannot override status codes)*
- [x] Capture **request bodies** — populated from `Network.requestWillBeSent` postData (+ `getRequestPostData` fallback)
- [x] Per-request / per-pattern throttling — `delayMs` per rule via `Fetch.continueRequest` latency *(native throttling is tab-global only)*
- [x] GraphQL-aware grouping — parse `operationName`, group by operation/type (`shared/graphql.ts`) *(native lumps all GraphQL into one opaque POST)*
- [x] Deep WS frame stream + SSE event-stream inspector (JSON pretty-print, direction/search filter); track WS lifecycle (`webSocketCreated`/handshake/`webSocketClosed`)

## Tier 3 — Correlation Capstone ✅

- [x] Unified timeline — network + console + perf on one time axis, click-to-cross-filter (`shared/timeline.ts`, `Timeline` tab)
- [x] Macro-AI (reuses kept client) — "explain this leak / this waterfall / why these errors correlate", opt-in + key-gated, **metadata-only** (`components/ai/AIAnalysisPanel.tsx`)

---

## Cut (deliberately not building)

- **AI per-call summary** — a request's URL/status/headers are already fully visible; an LLM paraphrase adds latency, cost, and a key requirement for zero insight.
- **MCP → Claude Code bridge** — deferred; currently inert scaffolding, not core to "100x". Revisit after Tier 1 + mocking land.

## Security invariants (must hold across every feature)

- Anthropic API key stored **only** in `chrome.storage.local`; never transmitted except to Anthropic on an explicit user action.
- No request bodies sent to AI unless the user explicitly triggers a macro-AI action.
- MCP connection is localhost-only; no external exposure.
- No analytics or telemetry.

---

## Manual verification checklist

> All items below are implemented and pass automated checks (`npm run build`, `npx tsc --noEmit`, 35 unit tests).
> **You** tick these after hands-on testing in Chrome. Load the unpacked build (`devlens/dist`) via `chrome://extensions` → Load unpacked, then open DevTools → **DevLens** on a real page.
>
> Status legend: leave `[ ]` until verified, set `[x]` once confirmed. Add notes inline after any item that misbehaves.

### Tier 1 — Performance

- [ ] **Live vitals update ~1 Hz** — Performance tab shows heap / nodes / listeners moving; sparklines scroll.
  - *How:* open a heavy SPA, watch the numbers tick each second.
- [ ] **Node count tracks reality** — open a big modal/list → `Nodes` jumps up; close it → drops back.
- [ ] **Threshold coloring** — a steadily climbing heap/nodes value turns red (not stuck green).
- [ ] **DOM provenance (live)** — the "which subtree is growing" list names the container that just grew.
  - *How:* mount a large component, confirm its container tops the provenance bars.
- [ ] **Leak scan (on-demand)** — click Scan; after mounting+unmounting a component that leaks a listener, a detached-node group appears.
- [ ] **No "Explain" button** on individual requests (per-call AI was cut).

### Tier 2 — Network superpowers

- [ ] **Status override** — add a Mocks rule forcing a real 200 endpoint to `500`; reload; the app receives 500 and the request row shows a **MOCKED** badge.
- [ ] **Body override** — set a JSON body on a rule; confirm the page sees the replaced body, not the original.
- [ ] **Fail request** — set fail reason `Failed`; confirm the request errors in the app as a network failure.
- [ ] **Per-pattern throttle** — set `delayMs: 3000` on one endpoint only; confirm just that call is slow, others stay fast.
- [ ] **Rule persistence** — reload DevTools; saved rules are still present (loaded from `chrome.storage.local`).
- [ ] **Request bodies captured** — a POST shows its request body in the Body tab.
- [ ] **GraphQL grouping** — hitting a `/graphql` endpoint shows the operation name + type badge; grouping by GraphQL operation splits calls by name.
- [ ] **WS inspector** — a live WebSocket shows lifecycle state (connecting/open/closed) and frames; direction + search filters work; JSON frames pretty-print on expand.
- [ ] **SSE inspector** — an `text/event-stream` endpoint lists events with name/id/timestamp; search filters; JSON data pretty-prints.

### Tier 3 — Correlation capstone

- [ ] **Timeline renders 3 lanes** — network / console / perf markers appear on one axis after activity.
- [ ] **Cross-filter click** — clicking a network marker selects that request and jumps to the Network tab; a console marker jumps to Console filtered to that message; a perf marker jumps to Performance.
- [ ] **Marker severity colors** — 5xx/errors are red, 4xx/warnings amber, 2xx green.
- [ ] **Macro-AI (leak)** — with an API key set, "Explain leak" streams a diagnosis; with no key it shows the "configure key" message (does **not** crash).
- [ ] **Macro-AI privacy** — confirm (via network panel on the extension itself, or code review) the AI request payload contains only metadata summaries — **no request/response bodies**.

### Security invariants (spot-check)

- [ ] API key never leaves `chrome.storage.local` except in the explicit Anthropic call.
- [ ] No telemetry/analytics network calls originate from the extension.
- [ ] MCP bridge only ever targets `localhost`.
