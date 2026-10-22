import { useRef, type RefObject } from 'react'
import { AnimatedBeam } from '@/components/ui/animated-beam'

interface Props {
  remaining: number
  total: number
}

interface Column {
  name: string
  type: string
  note?: string
  key?: 'PK' | 'FK'
  /** A live value from the page, shown beside the column. */
  live?: string
}

const asEl = (r: RefObject<HTMLLIElement | null>) => r as RefObject<HTMLElement | null>

/**
 * The three tables from docs/DATABASE.md, with the relationships drawn as
 * beams and the two numbers that matter kept live: the stock row's
 * remaining, and the purchase count that must always equal total minus
 * remaining. The hot row is the one in copper.
 */
export function SchemaDiagram({ remaining, total }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const dropId = useRef<HTMLLIElement>(null)
  const stockFk = useRef<HTMLLIElement>(null)
  const purchaseFk = useRef<HTMLLIElement>(null)

  const sold = Math.max(0, total - remaining)

  const drop: Column[] = [
    { name: 'id', type: 'bigint', key: 'PK' },
    { name: 'name', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'price_pence', type: 'integer' },
    { name: 'currency', type: 'text' },
    { name: 'image_url', type: 'text' },
    { name: 'opens_at', type: 'timestamptz' },
    { name: 'total_units', type: 'integer', live: String(total) },
  ]
  const stock: Column[] = [
    { name: 'drop_id', type: 'bigint', key: 'FK', note: 'also the primary key' },
    { name: 'remaining', type: 'integer', note: 'CHECK (remaining >= 0)', live: String(remaining) },
    { name: 'version', type: 'bigint', note: 'optimistic locking only' },
  ]
  const purchase: Column[] = [
    { name: 'id', type: 'bigserial', key: 'PK' },
    { name: 'drop_id', type: 'bigint', key: 'FK' },
    { name: 'buyer_name', type: 'text' },
    { name: 'strategy', type: 'text', note: 'conditional | optimistic | pessimistic' },
    { name: 'purchased_at', type: 'timestamptz' },
  ]

  const table = (name: string, cols: Column[], opts: { hot?: boolean; rows?: string; refs?: Record<string, RefObject<HTMLLIElement | null>> }) => (
    <div className={`schema-table${opts.hot ? ' hot' : ''}`}>
      <div className="schema-head">
        <span className="schema-name">{name}</span>
        {opts.rows && <span className="schema-rows">{opts.rows}</span>}
      </div>
      <ul className="schema-cols">
        {cols.map((c) => (
          <li key={c.name} ref={opts.refs?.[c.name]} className={`schema-col${c.key ? ' keyed' : ''}`}>
            <span className="schema-colname">
              {c.name}
              {c.key && <span className="schema-key">{c.key}</span>}
            </span>
            <span className="schema-type">{c.type}</span>
            {c.live !== undefined && <span className="schema-live">{c.live}</span>}
            {c.note && <span className="schema-note">{c.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <section className="schema" aria-labelledby="schema-title">
      <p className="eyebrow" id="schema-title">
        The schema
      </p>
      <h2>Three tables. One of them is the whole contention point.</h2>
      <p className="muted">
        <strong>drop</strong> is read at page load and never written during the drop. <strong>stock</strong> is one
        row, two columns of data, and every purchase touches it first. <strong>purchase</strong> is the audit trail.
        The identity that every test and every load run checks: total units minus remaining equals the number of
        purchase rows.
      </p>

      <div className="schema-grid" ref={gridRef}>
        <div className="schema-beams text-(--control)" aria-hidden="true">
          <AnimatedBeam
            containerRef={gridRef}
            fromRef={asEl(dropId)}
            toRef={asEl(stockFk)}
            pathColor="currentColor"
            pathOpacity={0.45}
            pathWidth={1.5}
            gradientStartColor="transparent"
            gradientStopColor="transparent"
            repeat={0}
          />
          <AnimatedBeam
            containerRef={gridRef}
            fromRef={asEl(dropId)}
            toRef={asEl(purchaseFk)}
            curvature={-40}
            pathColor="currentColor"
            pathOpacity={0.45}
            pathWidth={1.5}
            gradientStartColor="transparent"
            gradientStopColor="transparent"
            repeat={0}
          />
        </div>

        {table('drop', drop, { rows: '1 row', refs: { id: dropId } })}
        {table('stock', stock, { hot: true, rows: '1 row, the hot one', refs: { drop_id: stockFk } })}
        {table('purchase', purchase, { rows: `${sold} rows = ${total} − ${remaining}`, refs: { drop_id: purchaseFk } })}
      </div>

      <dl className="schema-legend">
        <div>
          <dt>1 → 1</dt>
          <dd>drop to stock. The counter lives apart from the static product so the hot row stays tiny.</dd>
        </div>
        <div>
          <dt>1 → many</dt>
          <dd>drop to purchase. One row per unit sold, written in the same transaction as the decrement.</dd>
        </div>
        <div>
          <dt>CHECK</dt>
          <dd>A second guard behind the WHERE clause. Experiment 6 removes both to make the stock go negative on purpose.</dd>
        </div>
      </dl>
    </section>
  )
}
