import { SIMULATED_BUYERS, type Phase, type SimulationResult } from '../types'

interface Props {
  phase: Phase
  total: number
  simulation: SimulationResult | 'running' | 'error' | null
  onSimulate: () => void
  onReset: () => void
}

/**
 * The two buttons that make the project's point without a terminal: fire a
 * stampede at the real purchase path, watch the counter, then put the stock
 * back. Shown only when the server reports demo: true.
 */
export function DemoPanel({ phase, total, simulation, onSimulate, onReset }: Props) {
  const running = simulation === 'running'
  const busy = phase === 'loading' || running
  const result = simulation !== null && simulation !== 'running' && simulation !== 'error' ? simulation : null

  return (
    <section className="demo" aria-labelledby="demo-title">
      <p className="eyebrow small" id="demo-title">
        Try the stampede
      </p>
      <p className="muted">
        {SIMULATED_BUYERS} buyers hit the server in the same instant, through the same purchase path as the button
        above. The database decides who gets a unit. Every viewer sees the counter fall live.
      </p>

      <div className="demo-actions">
        <button type="button" className="demo-run" onClick={onSimulate} disabled={busy || phase === 'before'}>
          {running ? 'Running…' : `Simulate ${SIMULATED_BUYERS} buyers`}
        </button>
        <button type="button" className="demo-reset" onClick={onReset} disabled={busy}>
          Reset the drop
        </button>
      </div>

      <p className="demo-result" role="status" aria-live="polite">
        {running && 'Sending every buyer at once…'}
        {simulation === 'error' && 'The server did not answer. Try again.'}
        {result && (
          <>
            <strong>{result.sold} sold</strong> of {total}, {result.soldOut} turned away empty-handed
            {result.notOpen > 0 && `, ${result.notOpen} too early`}
            {result.failed > 0 && `, ${result.failed} errors`}. {result.remaining} left. Never one more than the stock.
          </>
        )}
      </p>
    </section>
  )
}
