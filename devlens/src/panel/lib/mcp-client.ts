import type { DebugContext } from '../../shared/types'
import { DEFAULT_CLAUDE_CODE_PORT } from '../../shared/config'

export class ClaudeCodeMCPClient {
  private port: number
  private connected = false

  constructor(port: number = DEFAULT_CLAUDE_CODE_PORT) {
    this.port = port
  }

  async connect(port?: number): Promise<void> {
    if (port) this.port = port
    // Signal background to establish WS connection
    const response = await chrome.runtime.sendMessage({
      type: 'MCP_CONNECT',
      payload: { port: this.port },
    })
    this.connected = response?.ok === true
  }

  async sendContext(payload: DebugContext): Promise<void> {
    if (!this.connected) return
    await chrome.runtime.sendMessage({ type: 'SEND_TO_MCP', payload })
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async disconnect(): Promise<void> {
    await chrome.runtime.sendMessage({ type: 'MCP_DISCONNECT' })
    this.connected = false
  }
}
