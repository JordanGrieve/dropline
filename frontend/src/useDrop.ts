import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LOW_STOCK_AT,
  PurchaseError,
  type DropClient,
  type DropInfo,
  type Moment,
  type Phase,
  type ServerState,
} from './types'

export interface DropState {
  phase: Phase
  drop: DropInfo | null
  remaining: number
  /** Milliseconds until the drop opens, by the server's clock. */
  untilOpen: number
  connected: boolean
  loadError: boolean
  moment: Moment
  unit: number | null
  buyerName: string
  buy: (buyerName: string) => Promise<void>
}

const RECONNECT_BASE_MS = 500
const RECONNECT_MAX_MS = 8000

export function useDrop(client: DropClient): DropState {
  const [drop, setDrop] = useState<DropInfo | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [serverState, setServerState] = useState<ServerState>('before')
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [moment, setMoment] = useState<Moment>('none')
  const [unit, setUnit] = useState<number | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const offsetRef = useRef(0)

  // 1. The drop itself, once.
  useEffect(() => {
    let cancelled = false
    client
      .getDrop()
      .then((d) => {
        if (cancelled) return
        offsetRef.current = new Date(d.serverTime).getTime() - Date.now()
        setDrop(d)
        setRemaining(d.remaining)
        setServerState(d.state)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [client])

  // 2. The live counter. Reconnects with backoff; every new connection gets
  //    a snapshot from the server, so there is nothing to replay.
  useEffect(() => {
    let attempt = 0
    let timer: number | undefined
    let unsubscribe: (() => void) | undefined
    let stopped = false

    const connect = () => {
      if (stopped) return
      unsubscribe = client.subscribe(
        (m) => {
          attempt = 0
          setConnected(true)
          if (typeof m.remaining === 'number') setRemaining(m.remaining)
          if (m.state) setServerState(m.state)
        },
        () => {
          setConnected(false)
          const wait = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt)
          attempt += 1
          timer = window.setTimeout(connect, wait)
        },
      )
    }
    connect()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      unsubscribe?.()
    }
  }, [client])

  // 3. The clock, once a second, only while the countdown is showing.
  const opensAtMs = drop ? new Date(drop.opensAt).getTime() : 0
  const untilOpen = drop ? opensAtMs - (now + offsetRef.current) : Infinity
  const countingDown = !!drop && serverState === 'before' && untilOpen > 0
  useEffect(() => {
    if (!countingDown) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [countingDown])

  // 4. Phase, derived. The server's word wins; the clock only opens the
  //    button locally if the server has not said so yet.
  let phase: Phase
  if (!drop) phase = 'loading'
  else if (serverState === 'soldout' || remaining <= 0) phase = 'soldout'
  else if (serverState === 'before' && untilOpen > 0) phase = 'before'
  else if (remaining <= LOW_STOCK_AT) phase = 'low'
  else phase = 'open'

  const buy = useCallback(
    async (name: string) => {
      setBuyerName(name)
      setMoment('pending')
      try {
        const r = await client.purchase(name)
        setUnit(r.unit)
        setRemaining(r.remaining)
        setMoment('success')
      } catch (e) {
        if (e instanceof PurchaseError && e.kind === 'soldout') {
          setRemaining(0)
          setServerState('soldout')
          setMoment('failed')
        } else {
          setMoment('error')
        }
      }
    },
    [client],
  )

  return {
    phase,
    drop,
    remaining,
    untilOpen,
    connected,
    loadError,
    moment,
    unit,
    buyerName,
    buy,
  }
}
