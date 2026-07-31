import type { DebugContext } from '../shared/types'
import { getConfig, DEFAULT_CLAUDE_CODE_PORT } from '../shared/config'

export class MCPBridge {
  private static instance: MCPBridge
  private ws: WebSocket | null = null
  private connected = false

  static getInstance(): MCPBridge {
    if (!MCPBridge.instance) {
      MCPBridge.instance = new MCPBridge()
    }
    return MCPBridge.instance
  }

  async connect(): Promise<void> {
    const config = await getConfig()
    const port = config.claudeCodePort ?? DEFAULT_CLAUDE_CODE_PORT
    const url = `ws://127.0.0.1:${port}/devlens`

    this.ws = new WebSocket(url)
    this.ws.onopen = () => { this.connected = true }
    this.ws.onclose = () => { this.connected = false; this.ws = null }
    this.ws.onerror = () => { this.connected = false; this.ws = null }
  }

  send(context: DebugContext): void {
    if (!this.connected || !this.ws) return
    this.ws.send(JSON.stringify(context))
  }

  isConnected(): boolean {
    return this.connected
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
    this.connected = false
  }
}
