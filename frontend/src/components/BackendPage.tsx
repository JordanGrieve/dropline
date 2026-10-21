import { useRef } from 'react'
import { SIMULATED_BUYERS } from '../types'
import type { DropState } from '../useDrop'
import { DemoPanel } from './DemoPanel'
import { Wire } from './Wire'

interface Props {
  d: DropState
  total: number
  onReset: () => void
}

/**
 * The backend, shown. The same live drop as the home page, but the view is
 * the request path and the stampede rather than the product.
 */
export function BackendPage({ d, total, onReset }: Props) {
  const wireRef = useRef<HTMLElement>(null)
  const result = d.simulation !== null && d.simulation !== 'running' && d.simulation !== 'error' ? d.simulation : null

  return (
    <section className="backend" aria-labelledby="backend-title">
      <div className="backend-intro">
        <p className="eyebrow">Backend</p>
        <h1 id="backend-title">What happens when {SIMULATED_BUYERS} people press Buy at once</h1>
        <p className="muted">
          Every request goes through nginx to one of two app instances, and each instance asks Postgres for a unit in
          one statement. There is no read, then think, then write. The database decides, and zero rows affected means
          sold out. The counter on every open page is updated over a WebSocket after the commit, never before.
        </p>
      </div>

      <Wire
        ref={wireRef}
        running={d.simulation === 'running'}
        result={result}
        latencyMs={d.latencyMs}
        pulse={d.pulse}
        remaining={d.remaining}
        total={total}
      />

      <pre className="sql" aria-label="The purchase statement">
        <code>{`UPDATE stock
   SET remaining = remaining - 1
 WHERE drop_id = ? AND remaining > 0
RETURNING remaining;`}</code>
      </pre>

      {d.drop?.demo && (
        <DemoPanel
          phase={d.phase}
          total={total}
          simulation={d.simulation}
          onSimulate={() => {
            wireRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            void d.simulate()
          }}
          onReset={onReset}
        />
      )}
    </section>
  )
}
