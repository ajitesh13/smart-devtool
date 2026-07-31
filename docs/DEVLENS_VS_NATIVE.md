# DevLens vs Chrome & Firefox DevTools — the "100x" case

> Purpose: prove, feature by feature, where DevLens beats the native DevTools
> shipped in Chrome and Firefox. We only claim an edge where native tooling is
> genuinely absent, buried, or painful. Columns: **Chrome** / **Firefox** =
> what native does today; **DevLens** = our differentiator.
>
> Legend: ✅ solid · 🟡 partial/buried · ❌ absent
>
> Status tags on DevLens rows: **[shipped]** / **[Tier 2]** / **[Tier 3]** — see `DEVLENS_ROADMAP.md`.

---

## The one-line thesis

Native DevTools give you **four separate expert tools** (Network, Console, Performance, Memory) that don't talk to each other. DevLens is the **correlation layer**: one place where a network failure, its console error, and the memory/CPU cost of the code that ran are on the same screen, queryable, and linked. That glue — not any single panel — is the 100x.

---

## 1. Network inspection & triage

| Capability | Chrome | Firefox | DevLens |
|---|---|---|---|
| Basic request list, headers, timing | ✅ | ✅ | ✅ matches native |
| Filtering | 🟡 single substring box + a few `is:`/`-domain:` tokens | 🟡 substring + type toggles | ✅ **[shipped]** full query engine: regex, `eq/contains/gt/lt/range`, negate, AND/OR across url/method/status/headers/body/duration |
| Grouping requests | ❌ flat list only | 🟡 group-by-nothing (only by-frame) | ✅ **[shipped]** group by domain / endpoint / status-class / protocol / method / **regex named-capture**, with per-group stats |
| Multi-sort | 🟡 single column | 🟡 single column | ✅ **[shipped]** multi-key sort |
| See XHR + Fetch + WS + SSE **side by side** | ❌ one list, filter swaps context | ❌ | ✅ **[shipped]** split multi-pane, auto-by-protocol |
| Override **response status code** (force 500/429) | ❌ cannot | ❌ cannot | ✅ **[Tier 2]** via CDP `Fetch` domain |
| Mock response body / add delay | 🟡 Local Overrides (files, clunky, no status) | 🟡 no body mock | ✅ **[Tier 2]** inline rule, status+body+delay |
| Throttle **one** request/pattern | ❌ global-only | ❌ global-only | ✅ **[Tier 2]** per-pattern |
| Edit & resend a request | 🟡 "Replay XHR" (XHR only) | ✅ Edit & Resend | ✅ **[Tier 2]** (parity + override rules) |

## 2. WebSocket / SSE / GraphQL

| Capability | Chrome | Firefox | DevLens |
|---|---|---|---|
| WS frame stream after handshake | 🟡 hidden sub-tab, no filtering | ✅ decent frame list | ✅ **[shipped capture]** frames stored; **[Tier 2]** filter + JSON tree + replay |
| SSE event-stream inspection | 🟡 raw EventStream tab | 🟡 minimal | ✅ **[Tier 2]** parsed event stream + filter |
| GraphQL awareness | ❌ every op is opaque `POST /graphql` | ❌ same | ✅ **[Tier 2]** group by `operationName`, split query/variables/errors |

## 3. Console ↔ everything correlation *(the differentiator)*

| Capability | Chrome | Firefox | DevLens |
|---|---|---|---|
| Console messages | ✅ | ✅ | ✅ |
| CORS/preflight failure: link the console error ↔ the network row | ❌ eyeball-match by hand | ❌ | ✅ **[shipped]** hard link (URL/stack/`networkRequestId`) + heuristic timing link, confidence tooltip, one-click jump |
| Filter console by "has a linked request" | ❌ | ❌ | ✅ **[shipped]** linked/unlinked filter + regex |

## 4. Performance / CPU — daily use, not once-a-quarter

| Capability | Chrome | Firefox | DevLens |
|---|---|---|---|
| Live heap / CPU / DOM-node / listener readout | 🟡 Performance Monitor exists but buried, not next to network/console | ❌ no live monitor | ✅ **[shipped]** live vitals @1Hz with sparklines, pinned in the same tool |
| Layout/style-recalc counters live | 🟡 buried | ❌ | ✅ **[shipped]** |
| CPU-busy % without recording a trace | ❌ must record a profile | ❌ must record | ✅ **[shipped]** derived from `TaskDuration` deltas, always-on |

## 5. Memory / DOM — approachable, not intimidating

| Capability | Chrome | Firefox | DevLens |
|---|---|---|---|
| "Where do my DOM nodes come from?" | ❌ node count only, no attribution | ❌ | ✅ **[shipped]** live subtree attribution — which container holds/grows the nodes |
| Detached-node leak detection | 🟡 heap snapshot → manual "Detached" filter, expert-only | 🟡 heavy analysis view | ✅ **[shipped]** one-click scan (`DOM.getDetachedDomNodes`), grouped by container |
| Leak workflow usable in daily dev | ❌ intimidating | ❌ | ✅ **[shipped]** button + table, no snapshot reading |

## 6. Cross-signal timeline & assist

| Capability | Chrome | Firefox | DevLens |
|---|---|---|---|
| One time axis aligning network + console + perf | ❌ separate panels, separate clocks | ❌ | ✅ **[Tier 3]** unified timeline, click-to-cross-filter |
| Explain a *pattern* (leak / waterfall / correlated errors) | ❌ | ❌ | ✅ **[Tier 3]** opt-in macro-AI (key-gated) |

---

## Deliberately NOT built (kept honest)

- **Per-call AI summary of a request** — URL/status/headers are already visible; an LLM paraphrase adds latency + cost + a key requirement for zero insight. Cut.
- **Reimplementing the DOM/CSS inspector, sources debugger, breakpoints, coverage, Lighthouse** — native does these well; we don't compete there. DevLens is a *complement*, launched inside DevTools, not a replacement.

## Where native still wins (we don't pretend otherwise)

- Full flame-chart profiling & call trees (Chrome Performance panel).
- Source-level debugging, breakpoints, stepping.
- CSS grid/flex/animation inspectors (Firefox especially strong).
- Lighthouse / accessibility audits.

**DevLens' bet:** the daily 80% — triage a failing request, tie it to its console error, and know the memory/CPU cost — should take seconds and live in one queryable surface. That's the 100x, not out-featuring every native panel.
