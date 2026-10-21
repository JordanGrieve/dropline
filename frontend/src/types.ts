/**
 * The contract between this page and the backend. The backend is built to
 * this; see docs/ARCHITECTURE.md.
 *
 *   GET  /api/drop          -> DropInfo
 *   POST /api/purchase      { buyerName }  -> 201 PurchaseResult
 *                                            409 sold out
 *                                            425 drop not open yet
 *   WS   /ws                -> StockMessage, one per change; a full snapshot
 *                              on every new connection
 */

export type ServerState = 'before' | 'open' | 'soldout'

export interface DropInfo {
  name: string
  pricePence: number
  currency: string
  imageUrl: string | null
  totalUnits: number
  opensAt: string
  remaining: number
  state: ServerState
  serverTime: string
}

export interface PurchaseResult {
  unit: number
  remaining: number
}

export type StockMessage =
  | { remaining: number; state?: ServerState }
  | { state: ServerState; remaining?: number }

/** What the page derives from server state plus the clock. */
export type Phase = 'loading' | 'before' | 'open' | 'low' | 'soldout'

/** The result of this viewer's own purchase attempt. */
export type Moment = 'none' | 'pending' | 'success' | 'failed' | 'error'

export const LOW_STOCK_AT = 10

export class PurchaseError extends Error {
  readonly kind: 'soldout' | 'notopen' | 'error'
  constructor(kind: 'soldout' | 'notopen' | 'error', message: string) {
    super(message)
    this.kind = kind
  }
}

export interface DropClient {
  getDrop(): Promise<DropInfo>
  purchase(buyerName: string): Promise<PurchaseResult>
  /** Returns an unsubscribe function. onClose fires when the connection drops. */
  subscribe(onMessage: (m: StockMessage) => void, onClose: () => void): () => void
}
