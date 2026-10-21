import { formatCountdown, formatOpensAt, spokenCountdown } from '../format'
import type { Phase } from '../types'

interface Props {
  phase: Phase
  opensAt: string
  untilOpen: number
}

export function Opening({ phase, opensAt, untilOpen }: Props) {
  if (phase === 'before') {
    return (
      <div className="opening">
        <span className="eyebrow">Opens in</span>
        <span className="clock" role="timer" aria-label={spokenCountdown(untilOpen)}>
          {formatCountdown(untilOpen)}
        </span>
        <span className="muted">
          <time dateTime={opensAt}>{formatOpensAt(opensAt)}</time>
        </span>
      </div>
    )
  }
  const sold = phase === 'soldout'
  return (
    <div className="opening">
      <span className={`state-word${phase === 'low' ? ' low' : ''}`}>{sold ? 'Sold out' : 'Open'}</span>
      <span className="muted">
        {sold ? 'Opened' : 'since'} <time dateTime={opensAt}>{formatOpensAt(opensAt)}</time>
      </span>
    </div>
  )
}
