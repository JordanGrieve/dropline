import { useEffect, useRef } from 'react'
import { formatPrice } from '../format'
import { LOW_STOCK_AT, type DropClient } from '../types'
import { useAnnouncer } from '../useAnnouncer'
import { useDrop } from '../useDrop'
import { BuyForm } from './BuyForm'
import { Opening } from './Opening'
import { ProductImage } from './ProductImage'
import { StatusPanel } from './StatusPanel'
import { StockCounter } from './StockCounter'

interface Props {
  client: DropClient
}

export function DropPage({ client }: Props) {
  const d = useDrop(client)
  const { text: announcement, say } = useAnnouncer()
  const statusRef = useRef<HTMLDivElement>(null)
  const total = d.drop?.totalUnits ?? 0

  // Milestones and state changes. Each key speaks once; sold out and the
  // viewer's own result go out immediately, the rest keep a minimum gap.
  useEffect(() => {
    if (d.phase === 'loading') return
    if (d.phase === 'soldout') say('soldout', `Sold out. All ${total} units claimed.`, true)
    else if (d.phase !== 'before') {
      say('open', `Drop open. ${d.remaining} of ${total} units available.`)
      if (d.remaining <= total / 2) say('half', `Half gone. ${d.remaining} of ${total} units left.`)
      if (d.remaining <= LOW_STOCK_AT) say('ten', `Ten left. ${d.remaining} units remain.`)
    }
  }, [d.phase, d.remaining, total, say])

  useEffect(() => {
    if (d.moment === 'success') say('success', 'Purchase confirmed. Your unit is reserved.', true)
    if (d.moment === 'failed') say('failed', 'Sold out before your purchase reached the server. Nothing was reserved.', true)
    if (d.moment === 'error') say('error', 'Something went wrong. Nothing was reserved.', true)
  }, [d.moment, say])

  // When the button goes away, or a result lands, focus the panel that says why.
  useEffect(() => {
    if (d.phase === 'soldout' || d.moment === 'success' || d.moment === 'failed' || d.moment === 'error') {
      statusRef.current?.focus()
    }
  }, [d.phase, d.moment])

  if (d.loadError) {
    return (
      <main className="card">
        <header className="masthead">
          <span className="wordmark">Dropline</span>
        </header>
        <p role="alert">The drop could not be loaded. Refresh to try again.</p>
      </main>
    )
  }

  const drop = d.drop

  return (
    <main className="card" data-phase={d.phase} data-moment={d.moment}>
      <header className="masthead">
        <span className="wordmark">Dropline</span>
        <p className="meta">Edition 001 · {drop ? `${total} units` : '…'}</p>
      </header>

      <div className="layout">
        <ProductImage name={drop?.name ?? 'Product'} imageUrl={drop?.imageUrl ?? null} />

        <section className="drop" aria-label="Drop">
          {drop && <Opening phase={d.phase} opensAt={drop.opensAt} untilOpen={d.untilOpen} />}

          <StockCounter phase={d.phase} remaining={d.remaining} total={total} announcement={announcement} />

          <div className="title-row">
            <h1>{drop?.name ?? 'Loading the drop'}</h1>
            {drop && <p className="price">{formatPrice(drop.pricePence, drop.currency)}</p>}
          </div>

          {d.phase !== 'soldout' && <BuyForm phase={d.phase} moment={d.moment} opensAt={drop?.opensAt ?? ''} onBuy={d.buy} />}

          <StatusPanel
            ref={statusRef}
            phase={d.phase}
            moment={d.moment}
            total={total}
            opensAt={drop?.opensAt ?? ''}
            unit={d.unit}
            buyerName={d.buyerName}
            connected={d.connected}
          />
        </section>
      </div>
    </main>
  )
}
