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

## Tier 2 — Network Superpowers 🔜

- [ ] Response/status **override + mocking** — force status code / body / delay via CDP `Fetch` domain *(native cannot override status codes)*
- [ ] Capture **request bodies** (currently never populated) — prerequisite for mocking + inspection
- [ ] Per-request / per-pattern throttling *(native throttling is tab-global only)*
- [ ] GraphQL-aware grouping — parse `operationName`, split query/variables/errors *(native lumps all GraphQL into one opaque POST)*
- [ ] Deep WS frame stream + SSE event-stream inspector (JSON tree, filter, replay); track WS lifecycle (`webSocketCreated`/handshake/`webSocketClosed`)

## Tier 3 — Correlation Capstone 🔮

- [ ] Unified timeline — network + console + perf on one time axis, click-to-cross-filter
- [ ] Macro-AI (reuses kept client) — "explain this leak / this waterfall / why these errors correlate", opt-in + key-gated

---

## Cut (deliberately not building)

- **AI per-call summary** — a request's URL/status/headers are already fully visible; an LLM paraphrase adds latency, cost, and a key requirement for zero insight.
- **MCP → Claude Code bridge** — deferred; currently inert scaffolding, not core to "100x". Revisit after Tier 1 + mocking land.

## Security invariants (must hold across every feature)

- Anthropic API key stored **only** in `chrome.storage.local`; never transmitted except to Anthropic on an explicit user action.
- No request bodies sent to AI unless the user explicitly triggers a macro-AI action.
- MCP connection is localhost-only; no external exposure.
- No analytics or telemetry.
