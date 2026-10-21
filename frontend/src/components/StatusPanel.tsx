import { forwardRef } from 'react'
import { formatOpensAtShort, padUnit } from '../format'
import type { Moment, Phase } from '../types'

interface Props {
  phase: Phase
  moment: Moment
  total: number
  opensAt: string
  unit: number | null
  buyerName: string
  connected: boolean
}

/**
 * Where this viewer's own result lands. It takes focus when the buy button
 * disappears at sold out, so a keyboard user is never dropped on the body.
 */
export const StatusPanel = forwardRef<HTMLDivElement, Props>(function StatusPanel(
  { phase, moment, total, opensAt, unit, buyerName, connected },
  ref,
) {
  const sold = phase === 'soldout'
  const framed = sold || moment === 'success'

  return (
    <div ref={ref} className={`status${framed ? ' framed' : ''}`} id="drop-status" role="status" tabIndex={-1} aria-label="Status">
      {!connected && phase !== 'loading' && <p className="muted">Reconnecting to the drop…</p>}

      {phase === 'before' && (
        <p className="muted">
          Type your name now. The button unlocks on its own at {formatOpensAtShort(opensAt)}. No need to refresh.
        </p>
      )}

      {(phase === 'open' || phase === 'low') && moment === 'none' && <p className="muted">One unit per press. Your result appears here.</p>}

      {moment === 'pending' && <p className="muted">Checking stock…</p>}

      {moment === 'success' && (
        <div className="result">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="10.5" />
            <path d="M7 12.5 L10.5 16 L17 8.5" />
          </svg>
          <div>
            <p className="result-title">Yours. Unit reserved.</p>
            <p className="muted">
              Unit {unit !== null ? padUnit(unit) : '—'} of {total} is held for {buyerName || 'you'}.
            </p>
          </div>
        </div>
      )}

      {moment === 'error' && (
        <p className="failed">
          <span>Something went wrong. Nothing was reserved. Try again.</span>
        </p>
      )}

      {sold && (
        <>
          {moment === 'failed' && (
            <p className="failed">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="9.5" />
                <path d="M11 6 V12" />
                <path d="M11 15 V15.6" />
              </svg>
              <span>Sold out before your click reached the server. Nothing was reserved.</span>
            </p>
          )}
          {moment !== 'success' && (
            <>
              <h2>Sold out</h2>
              <p className="muted">All {total} units of Edition 001 are reserved. Thank you for being here for the drop.</p>
            </>
          )}
        </>
      )}
    </div>
  )
})
