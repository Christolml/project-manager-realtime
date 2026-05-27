import type { WSMessage } from '../types'

type MessageHandler = (msg: WSMessage) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private projectId: string | null = null
  private token: string | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  connect(token: string) {
    this.token = token
    this.ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`)

    this.ws.onopen = () => {
      if (this.projectId) {
        this.subscribe(this.projectId)
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        const typeHandlers = this.handlers.get(msg.type)
        if (typeHandlers) {
          typeHandlers.forEach((h) => h(msg))
        }
        const allHandlers = this.handlers.get('*')
        if (allHandlers) {
          allHandlers.forEach((h) => h(msg))
        }
      } catch {
        /* ignore parse errors */
      }
    }

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => {
        if (this.token) this.connect(this.token)
      }, 3000)
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
    this.token = null
    this.projectId = null
  }

  subscribe(projectId: string) {
    this.projectId = projectId
    this.send({ type: 'subscribe', projectId })
  }

  unsubscribe(projectId: string) {
    this.send({ type: 'unsubscribe', projectId })
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.handlers.get(type)?.delete(handler)
  }

  private send(msg: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }
}

export const wsClient = new WSClient()
