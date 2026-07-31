# DevLens — Implementation Plan for Claude Code
> AI-powered Chrome DevTools Pro Extension with MCP Support

---

## 🧠 Project Overview

**DevLens** is a Chrome Extension that replaces and supercharges Chrome DevTools with:
- Unified multi-protocol network inspector (XHR + WS + SSE + Fetch)
- AI-powered request/error explanation (Claude API)
- Advanced regex/query filtering across all panels
- Smart console with noise suppression and AI log summarizer
- Plain-English performance profiling
- Framework-agnostic state debugger (React, Vue, Zustand, Redux)
- MCP integration with Claude Code for in-editor debugging context

---

## 🗂️ Project Structure

```
devlens/
├── manifest.json                  # Chrome Extension Manifest V3
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── background/
│   │   ├── index.ts               # Service worker (background script)
│   │   ├── network-interceptor.ts # CDP network event listener
│   │   ├── ws-interceptor.ts      # WebSocket frame capture
│   │   └── mcp-bridge.ts          # Claude Code MCP bridge
│   │
│   ├── devtools/
│   │   ├── index.html             # DevTools panel entry
│   │   └── index.ts               # Registers DevTools panel
│   │
│   ├── panel/                     # Main React UI (DevTools panel)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── store/
│   │   │   ├── network.store.ts   # Zustand store for network requests
│   │   │   ├── console.store.ts
│   │   │   ├── perf.store.ts
│   │   │   └── ai.store.ts
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TabBar.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   │
│   │   │   ├── network/
│   │   │   │   ├── NetworkPanel.tsx        # Main panel
│   │   │   │   ├── NetworkTable.tsx        # Virtualized request list
│   │   │   │   ├── NetworkFilterBar.tsx    # Regex + protocol filters
│   │   │   │   ├── RequestDetail.tsx       # Headers, payload, response
│   │   │   │   ├── WebSocketViewer.tsx     # WS frame timeline
│   │   │   │   └── ProtocolBadge.tsx       # XHR / WS / SSE / Fetch badge
│   │   │   │
│   │   │   ├── console/
│   │   │   │   ├── ConsolePanel.tsx
│   │   │   │   ├── LogEntry.tsx
│   │   │   │   ├── ConsoleFilter.tsx
│   │   │   │   └── LogGrouper.tsx
│   │   │   │
│   │   │   ├── performance/
│   │   │   │   ├── PerfPanel.tsx
│   │   │   │   ├── PerfSummaryCard.tsx    # Plain-English summary
│   │   │   │   └── TimelineChart.tsx
│   │   │   │
│   │   │   ├── state/
│   │   │   │   ├── StatePanel.tsx
│   │   │   │   ├── StateDiffViewer.tsx
│   │   │   │   └── StateTimeline.tsx
│   │   │   │
│   │   │   └── ai/
│   │   │       ├── AIExplainButton.tsx    # Trigger AI explanation
│   │   │       ├── AIDrawer.tsx           # Slide-in AI response panel
│   │   │       ├── AIChat.tsx             # Follow-up Q&A
│   │   │       └── ClaudeCodePanel.tsx    # Claude Code MCP connection UI
│   │   │
│   │   └── hooks/
│   │       ├── useNetworkStream.ts
│   │       ├── useAIExplain.ts
│   │       └── useClaudeCode.ts
│   │
│   ├── content/
│   │   └── state-observer.ts      # Injected into page to observe React/Vue state
│   │
│   └── shared/
│       ├── types.ts                # Shared TypeScript interfaces
│       ├── ai-client.ts            # Anthropic API client wrapper
│       ├── mcp-client.ts           # MCP client implementation
│       └── utils.ts
│
├── public/
│   ├── devtools.html
│   ├── panel.html
│   └── icons/
│
└── docs/
    └── ARCHITECTURE.md
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Extension Framework | Chrome Manifest V3 |
| UI | React 18 + TypeScript |
| Build Tool | Vite + CRXJS plugin |
| State Management | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| MCP | Model Context Protocol SDK (@modelcontextprotocol/sdk) — Claude Code only |
| Virtual Lists | @tanstack/react-virtual |
| Charts | Recharts |
| Testing | Vitest + Playwright |

---

## 🚀 Phase 1: Project Scaffold & Network Panel (Week 1)

### Task 1.1 — Initialize Chrome Extension
```bash
# Scaffold the project
npm create vite@latest devlens -- --template react-ts
cd devlens
npm install

# Install core dependencies
npm install zustand @tanstack/react-virtual recharts
npm install tailwindcss @tailwindcss/vite
npm install @crxjs/vite-plugin  # Chrome Extension + Vite integration

# Install AI + MCP
npm install @anthropic-ai/sdk
npm install @modelcontextprotocol/sdk

# Dev dependencies
npm install -D @types/chrome vitest playwright
```

### Task 1.2 — manifest.json (Manifest V3)
```json
{
  "manifest_version": 3,
  "name": "DevLens",
  "version": "0.1.0",
  "description": "AI-powered Chrome DevTools Pro",
  "permissions": [
    "debugger",
    "tabs",
    "storage",
    "scripting",
    "webRequest"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "devtools_page": "src/devtools/index.html",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/state-observer.ts"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

### Task 1.3 — Background Service Worker
- Attach Chrome Debugger Protocol (CDP) to the active tab
- Listen for `Network.*` CDP events (requestWillBeSent, responseReceived, webSocketCreated, webSocketFrameReceived)
- Forward all captured events to the DevTools panel via `chrome.runtime.sendMessage`
- Manage tab lifecycle (attach/detach on tab change)

### Task 1.4 — Network Store (Zustand)
```typescript
// src/panel/store/network.store.ts
interface NetworkRequest {
  id: string
  url: string
  method: string
  protocol: 'XHR' | 'Fetch' | 'WS' | 'SSE' | 'Other'
  status?: number
  statusText?: string
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: string
  responseBody?: string
  timing: { start: number; end?: number; duration?: number }
  wsFrames?: WSFrame[]
  error?: string
}

interface NetworkStore {
  requests: NetworkRequest[]
  filter: FilterState
  selectedId: string | null
  addRequest: (req: NetworkRequest) => void
  updateRequest: (id: string, update: Partial<NetworkRequest>) => void
  setFilter: (filter: Partial<FilterState>) => void
  clearAll: () => void
}
```

### Task 1.5 — NetworkPanel UI
- Virtualized table (10,000+ rows performant) using @tanstack/react-virtual
- Columns: Status, Method, Protocol badge, URL, Duration, Size
- Click row → slide-in RequestDetail panel (Headers / Payload / Response / Preview tabs)
- Color coding: red=error, yellow=slow (>1s), green=ok

### Task 1.6 — NetworkFilterBar
```
[ Protocol: ALL | XHR | WS | SSE | Fetch ]  [ /regex or text search ]  [ Status: 2xx | 4xx | 5xx ]  [ > 500ms ]  [ 🔴 Errors only ]
```
- Real-time filtering using Zustand derived state
- Regex toggle (prefix search with `/` to activate regex mode)
- Save filter presets to chrome.storage

---

## 🤖 Phase 2: AI Integration (Week 2)

### Task 2.1 — Anthropic API Client
```typescript
// src/shared/ai-client.ts
// Store API key in chrome.storage.local (user provides their own key)
// Never hardcode API keys

export async function explainRequest(request: NetworkRequest): Promise<string>
export async function explainError(error: ConsoleError): Promise<string>
export async function summarizeLogs(logs: LogEntry[]): Promise<string>
export async function explainPerformance(perfData: PerfData): Promise<string>
export async function askFollowUp(context: string, question: string): Promise<AsyncIterable<string>>
```

### Task 2.2 — AI Explain Feature (Network)
- "✨ Explain" button on every request row and in RequestDetail panel
- Sends: URL, method, status, response headers, truncated body (first 2000 chars)
- Returns: plain-English explanation + potential issues + suggested fixes
- Streaming response displayed in AIDrawer (slide-in panel, right side)

**Prompt template:**
```
You are a senior full-stack engineer reviewing a network request.
Explain this in plain English. Highlight any issues, performance concerns,
or security flags. Be concise and actionable.

Request: [METHOD] [URL]
Status: [STATUS]
Duration: [DURATION]ms
Response headers: [HEADERS]
Response body (truncated): [BODY]
```

### Task 2.3 — AI Console Summarizer
- "Summarize last 50 errors" button in Console panel
- Groups related errors, identifies root cause patterns
- Plain-English: "3 CORS errors from api.example.com — your backend needs Access-Control-Allow-Origin header"

### Task 2.4 — AI Performance Explainer
- After profiling session ends, "✨ Explain Performance" button
- Input: top slow functions, LCP, FID, CLS, total blocking time
- Output: "Your page is slow because X. Top 3 things to fix: ..."

### Task 2.5 — AIDrawer Component
- Slide-in panel from right (400px wide)
- Streaming text with typewriter effect
- Follow-up chat input (maintains context of original request)
- Copy button, "Open in new tab" for long responses
- Loading skeleton while streaming

### Task 2.6 — API Key Management
- Settings modal where user enters their Anthropic API key
- Stored in `chrome.storage.local` (never sent anywhere except Anthropic)
- Key validation on save
- Usage tracker (approximate token count used)

---

## 🔌 Phase 3: MCP — Claude Code Integration (Week 3)

### Task 3.1 — Architecture

Claude Code exposes a local MCP server when running. DevLens connects to it over SSE:
```
DevLens Panel → Background Service Worker → MCP Client (SSE) → Claude Code (localhost:PORT)
```

### Task 3.2 — Claude Code MCP Client
```typescript
// src/shared/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export class ClaudeCodeMCPClient {
  private client: Client | null = null

  async connect(port: number = 3000): Promise<void>
  async sendContext(payload: DebugContext): Promise<void>
  async isConnected(): Promise<boolean>
  async disconnect(): Promise<void>
}

interface DebugContext {
  type: 'network_request' | 'console_error' | 'performance' | 'state_diff'
  data: NetworkRequest | ConsoleError | PerfData | StateDiff
  aiSummary?: string   // optionally attach the AI explanation already generated
  question?: string    // e.g. "Why is this 401 happening? Fix it."
}
```

### Task 3.3 — "Send to Claude Code" Action
- Every network request, console error, and performance summary gets a **"→ Claude Code"** button
- Clicking it pushes the full context + optional user question to Claude Code's active session
- Claude Code immediately has everything it needs to find and fix the issue in the codebase
- Optional free-text field: "Ask Claude Code..." before sending

### Task 3.4 — Claude Code Connection UI (`ClaudeCodePanel.tsx`)
```
┌──────────────────────────────────┐
│ 🤖 Claude Code                   │
├──────────────────────────────────┤
│ Status: ● Connected (port 3000)  │
│                                  │
│ Port: [3000        ]  [Connect]  │
└──────────────────────────────────┘
```
- Auto-detect Claude Code MCP port on DevLens open
- Green/red connection indicator in StatusBar
- Stored port preference in `chrome.storage.local`

### Task 3.5 — Claude Code Config Storage
```typescript
// Stored in chrome.storage.local
interface ClaudeCodeConfig {
  port: number          // default: 3000
  autoConnect: boolean  // try to connect on DevLens open
  lastConnected?: number // timestamp
}
```

---

## 🎨 Phase 4: Console + State + Polish (Week 4)

### Task 4.1 — Smart Console Panel
- Mirror Chrome console logs via CDP `Runtime.consoleAPICalled`
- Filter by: log level, source file, regex text search, time range
- Group identical errors (show count badge)
- Third-party noise suppression: collapse logs from node_modules paths
- AI summarize button for error clusters

### Task 4.2 — State Debugger (React/Vue)
Content script injected into page:
- Detect React DevTools global hook (`window.__REACT_DEVTOOLS_GLOBAL_HOOK__`)
- Detect Vue DevTools hook (`window.__VUE_DEVTOOLS_GLOBAL_HOOK__`)
- Capture state snapshots on every render/mutation
- Send diffs to DevLens panel via `window.postMessage`

Panel features:
- Timeline of state snapshots (scrub back in time)
- Side-by-side diff viewer between any two snapshots
- "Why did this component re-render?" AI explanation
- Filter components by name

### Task 4.3 — Performance Panel (Simplified)
- Start/Stop profiling via CDP `Profiler.*`
- Parse raw profile into: slowest functions, call trees, timeline
- AI summary card at top: "Top 3 bottlenecks in plain English"
- Core Web Vitals overlay: LCP, FID, CLS with thresholds (green/yellow/red)

### Task 4.4 — Settings & Onboarding
- Welcome screen on first install
- API key setup wizard
- Claude Code MCP port setup (auto-detect or manual)
- Theme: Dark / Light / System
- Keyboard shortcuts config

### Task 4.5 — Export & Share
- Export current session as HAR file
- Copy request as: cURL, fetch(), Axios, Python requests
- Share session link (requires backend — defer to v2)

---

## 🔐 Security & Privacy

- API keys stored only in `chrome.storage.local` — never transmitted except to Anthropic
- Network request bodies are never sent to AI unless user explicitly clicks "Explain"
- Claude Code MCP connection is localhost-only — no external network exposure
- Option to exclude URLs matching patterns (e.g., `*.bank.com`)
- No analytics or telemetry in v1

---

## 📦 Build & Release

### Build Commands
```bash
# Development (hot reload)
npm run dev

# Production build
npm run build
# Output: dist/ folder — load as unpacked extension in Chrome

# Package for Chrome Web Store
npm run package
# Output: devlens-v0.1.0.zip
```

### Chrome Web Store Checklist
- [ ] Privacy policy page (required)
- [ ] Screenshots (1280x800 or 640x400)
- [ ] Promo tile (440x280)
- [ ] Detailed description with keywords
- [ ] Justification for each permission requested
- [ ] Demo video (optional but recommended)

---

## 💰 Monetization Implementation

### Freemium via Chrome Web Store
```typescript
// License tiers stored in chrome.storage.sync after purchase verification
type Tier = 'free' | 'pro' | 'team'

const FEATURE_GATES = {
  aiExplain: 'pro',          // AI explain any request
  regexFilter: 'pro',        // Regex filtering
  stateDebugger: 'pro',      // React/Vue state timeline
  claudeCodeMCP: 'pro',      // Send context to Claude Code
  teamSharing: 'team',       // Session sharing
  exportHAR: 'free',         // Basic export always free
  basicFilter: 'free',       // Protocol filter always free
}
```

Use **Polar.sh** or **LemonSqueezy** for payment processing → webhook updates license key in chrome.storage.

---

## 🧪 Testing Strategy

```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright + Chrome)
npm run test:e2e

# Test against real sites
# Load extension → open DevLens → navigate to test pages in /test-fixtures/
```

Test fixtures:
- `test-fixtures/xhr-heavy.html` — page making 50+ XHR requests
- `test-fixtures/websocket.html` — page with active WebSocket
- `test-fixtures/react-app/` — React app with complex state

---

## 📋 Sprint-by-Sprint Checklist

### Week 1 — Foundation
- [ ] Project scaffold (Vite + CRXJS + React + TypeScript)
- [ ] manifest.json with all required permissions
- [ ] Background service worker with CDP attachment
- [ ] Network event capture (XHR, Fetch, WS, SSE)
- [ ] Zustand network store
- [ ] Basic NetworkTable (virtualized)
- [ ] Protocol filter bar
- [ ] RequestDetail side panel

### Week 2 — AI Layer
- [ ] Anthropic API client with streaming
- [ ] API key settings modal
- [ ] "Explain Request" button + AIDrawer
- [ ] Console panel with CDP log capture
- [ ] AI Console Summarizer
- [ ] Basic Performance panel
- [ ] AI Performance Explainer

### Week 3 — Claude Code MCP Layer
- [ ] ClaudeCodeMCPClient (SSE transport to localhost)
- [ ] Auto-detect Claude Code port on DevLens open
- [ ] ClaudeCodePanel UI with connection status
- [ ] "→ Claude Code" button on network requests, console errors, perf summary
- [ ] DebugContext payload builder (attach AI summary + user question)
- [ ] Claude Code config storage + port settings UI

### Week 4 — Polish + Ship
- [ ] React/Vue state debugger
- [ ] State diff viewer
- [ ] Onboarding flow
- [ ] Dark/light theme
- [ ] Export as cURL / fetch / HAR
- [ ] Chrome Web Store submission
- [ ] Landing page (simple HTML or Framer)
- [ ] Product Hunt launch post

---

## 🔑 Environment Variables & Config

```typescript
// src/shared/config.ts
// Retrieved from chrome.storage.local at runtime — never hardcoded
export const getConfig = async () => {
  const stored = await chrome.storage.local.get([
    'anthropicApiKey',
    'claudeCodePort',
    'claudeCodeAutoConnect',
    'licenseKey',
    'tier',
    'excludePatterns',
  ])
  return stored
}
```

---

## 📚 Key References

- Chrome Extension Manifest V3: https://developer.chrome.com/docs/extensions/mv3/
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/
- CRXJS Vite Plugin: https://crxjs.dev/vite-plugin
- Anthropic SDK: https://github.com/anthropic-ai/anthropic-sdk-typescript
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Zustand: https://zustand-demo.pmnd.rs/

---

*Generated for DevLens v0.1.0 — Start with Phase 1, ship Phase 1+2 as MVP.*
