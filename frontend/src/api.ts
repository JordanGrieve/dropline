import {
  LOW_STOCK_AT,
  PurchaseError,
  type DropClient,
  type DropInfo,
  type PurchaseResult,
  type ServerState,
  type StockMessage,
} from './types'

/** The real client. Same origin, so no base URL. */
export const httpClient: DropClient = {
  async getDrop() {
    const res = await fetch('/api/drop', { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`GET /api/drop ${res.status}`)
    return (await res.json()) as DropInfo
  },

  async purchase(buyerName) {
    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ buyerName }),
    })
    if (res.status === 409) throw new PurchaseError('soldout', 'Sold out')
    if (res.status === 425) throw new PurchaseError('notopen', 'Not open yet')
    if (!res.ok) throw new PurchaseError('error', `POST /api/purchase ${res.status}`)
    return (await res.json()) as PurchaseResult
  },

  subscribe(onMessage, onClose) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws`)
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data) as StockMessage)
      } catch {
        // A malformed frame is ignored; the next one carries the current value.
      }
    }
    ws.onclose = onClose
    ws.onerror = () => ws.close()
    return () => {
      ws.onclose = null
      ws.close()
    }
  },
}

/**
 * A mock for working on the page before the backend exists, and for
 * reviewing every state. Enabled with ?mock, ?mock=open, ?mock=low,
 * ?mock=soldout. Not shipped in the real page's path.
 */
export function mockClient(start: string): DropClient {
  const total = 100
  const now = Date.now()
  let remaining = start === 'low' ? LOW_STOCK_AT + 1 : start === 'soldout' ? 0 : start === 'open' ? 46 : total
  let state: ServerState = start === 'soldout' ? 'soldout' : start === 'open' || start === 'low' ? 'open' : 'before'
  const opensAt = state === 'before' ? now + 9_000 : now - 60_000
  const listeners = new Set<(m: StockMessage) => void>()

  const broadcast = (m: StockMessage) => listeners.forEach((l) => l(m))

  setInterval(() => {
    if (state === 'before' && Date.now() >= opensAt) {
      state = 'open'
      broadcast({ state, remaining })
      return
    }
    if (state !== 'open') return
    const drop = remaining > 12 ? Math.floor(Math.random() * 6) : Math.random() < 0.45 ? 1 : 0
    if (drop === 0) return
    remaining = Math.max(0, remaining - drop)
    if (remaining === 0) state = 'soldout'
    broadcast({ remaining, state })
  }, 1000)

  return {
    async getDrop() {
      return {
        name: 'Dropline Watch, Edition 001',
        pricePence: 25000,
        currency: 'GBP',
        imageUrl: null,
        totalUnits: total,
        opensAt: new Date(opensAt).toISOString(),
        remaining,
        state,
        serverTime: new Date().toISOString(),
      }
    },
    purchase() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (state === 'before') return reject(new PurchaseError('notopen', 'Not open yet'))
          if (remaining <= 0) return reject(new PurchaseError('soldout', 'Sold out'))
          remaining -= 1
          const unit = total - remaining
          if (remaining === 0) state = 'soldout'
          broadcast({ remaining, state })
          resolve({ unit, remaining })
        }, 600)
      })
    },
    subscribe(onMessage) {
      listeners.add(onMessage)
      queueMicrotask(() => onMessage({ remaining, state }))
      return () => listeners.delete(onMessage)
    },
  }
}

export function chooseClient(): DropClient {
  const mock = new URLSearchParams(location.search).get('mock')
  return mock === null ? httpClient : mockClient(mock)
}
