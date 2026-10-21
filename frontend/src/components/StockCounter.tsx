import { LOW_STOCK_AT, type Phase } from '../types'

interface Props {
  phase: Phase
  remaining: number
  total: number
  announcement: string
}

export function StockCounter({ phase, remaining, total, announcement }: Props) {
  const low = phase === 'low'
  const sold = phase === 'soldout'
  const before = phase === 'before'
  const pct = total > 0 ? (remaining / total) * 100 : 0
  const halfHit = !before && remaining <= total / 2
  const tenHit = !before && remaining <= LOW_STOCK_AT
  const word = before ? 'Full stock' : sold ? 'Sold out' : low ? 'Last ten' : 'Available'

  return (
    <div className="stock">
      <p className="eyebrow small">Stock remaining</p>

      {/* Visual only. The text line below carries the value for assistive tech. */}
      <div className="hero" aria-hidden="true">
        <span className={`hero-number${low ? ' low' : ''}${sold ? ' soldout' : ''}`}>{remaining}</span>
        <span className="hero-total">/ {total}</span>
      </div>

      <div className="stock-row">
        <p className="stock-text">
          {remaining} of {total} units left
        </p>
        <p className={`tag${low ? ' low' : ''}`}>
          {low && (
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 1.5 L13 12.5 H1 Z" />
              <path d="M7 5.5 V8.5" />
              <path d="M7 10.2 V10.6" />
            </svg>
          )}
          <span>{word}</span>
        </p>
      </div>

      <div className="meter" aria-hidden="true">
        <div className="meter-track" />
        <div className={`meter-fill${low || sold ? ' low' : ''}`} style={{ width: `${pct}%` }} />
        <div className={`milestone${halfHit ? ' hit' : ''}`} style={{ left: '50%' }}>
          <span className="milestone-dot" />
          <span className="milestone-label">Half gone</span>
        </div>
        <div className={`milestone${tenHit ? ' hit' : ''}`} style={{ left: `${(LOW_STOCK_AT / total) * 100}%` }}>
          <span className="milestone-dot" />
          <span className="milestone-label">Ten left</span>
        </div>
      </div>

      {/* The only live region for stock. Milestones and state changes, never the raw counter. */}
      <div className={`announcer${low || sold ? ' low' : ''}`} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
