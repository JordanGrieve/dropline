import { useEffect, useRef, useState, type Ref, type RefObject } from 'react'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import type { SimulationResult } from '../types'

interface Props {
  /** A stampede is in flight: the beams run hard until the result lands. */
  running: boolean
  /** The last stampede's outcome, which decides what the last beam does. */
  result: SimulationResult | null
  /** Round trip of the last stampede, measured by the page. */
  latencyMs: number | null
  /** Bumps once per purchase this viewer makes, so one pass travels the wire. */
  pulse: number
  remaining: number
  total: number
  ref?: Ref<HTMLElement>
}

type Mode = 'idle' | 'running' | 'settled' | 'single'

/** The copper accent, as a plain colour: SVG gradient stops cannot read CSS variables. */
const COPPER = { light: '#743812', dark: '#eab28d' }
const MUTED = { light: '#7a756d', dark: '#8c877e' }

function useDarkScheme() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

/** Magic UI's beam wants RefObject<HTMLElement>; our refs are to spans. Same element, narrower type. */
const asEl = (r: RefObject<HTMLSpanElement | null>) => r as RefObject<HTMLElement | null>

/**
 * The path a request takes, drawn as one line: buyers, the nginx edge, the
 * two app instances, then the one stock row in Postgres that decides.
 * Magic UI's AnimatedBeam carries the traffic along each segment. During a
 * stampede every beam runs continuously. When the result comes back, one
 * forward pass reaches the stock row and, if anyone was turned away, a
 * muted beam bounces back off it, which is the whole point of the project.
 *
 * The drawing is aria-hidden. The numbers under it are the accessible version.
 */
export function Wire({ running, result, latencyMs, pulse, remaining, total, ref }: Props) {
  const dark = useDarkScheme()
  const copper = dark ? COPPER.dark : COPPER.light
  const muted = dark ? MUTED.dark : MUTED.light

  const rowRef = useRef<HTMLDivElement>(null)
  const buyers = useRef<HTMLSpanElement>(null)
  const edge = useRef<HTMLSpanElement>(null)
  const apps = useRef<HTMLSpanElement>(null)
  const stock = useRef<HTMLSpanElement>(null)

  const mode: Mode = running ? 'running' : result ? 'settled' : pulse > 0 ? 'single' : 'idle'
  const turnedAway = mode === 'settled' && result !== null && result.soldOut > 0
  const key = `${mode}-${pulse}-${result ? result.sold : 0}`

  // Idle: a slow, faint pass now and then, so the wire reads as live.
  // Running: hard and continuous. Settled and single: one pass, in order.
  const beam =
    mode === 'running'
      ? { duration: 1.2, repeat: Infinity, repeatDelay: 0, width: 2.5 }
      : mode === 'idle'
        ? { duration: 4, repeat: Infinity, repeatDelay: 3, width: 1.5 }
        : { duration: 1.1, repeat: 0, repeatDelay: 0, width: 2.5 }
  const stagger = mode === 'running' || mode === 'idle' ? 0 : 0.28

  const segments: [RefObject<HTMLSpanElement | null>, RefObject<HTMLSpanElement | null>][] = [
    [buyers, edge],
    [edge, apps],
    [apps, stock],
  ]

  return (
    <section ref={ref} className="wire" aria-label="How a purchase travels" data-mode={mode}>
      <div className="wire-row" ref={rowRef} aria-hidden="true">
        {/* Static fallback, shown only under prefers-reduced-motion. */}
        <span className="wire-line" />

        <div className="wire-beams text-(--control)" key={key}>
          {segments.map(([from, to], i) => (
            <AnimatedBeam
              key={i}
              containerRef={rowRef}
              fromRef={asEl(from)}
              toRef={asEl(to)}
              pathColor="currentColor"
              pathOpacity={0.5}
              pathWidth={beam.width}
              gradientStartColor={copper}
              gradientStopColor={copper}
              duration={beam.duration}
              delay={i * stagger}
              repeat={beam.repeat}
              repeatDelay={beam.repeatDelay}
            />
          ))}
          {turnedAway && (
            <AnimatedBeam
              containerRef={rowRef}
              fromRef={asEl(apps)}
              toRef={asEl(stock)}
              reverse
              pathColor="transparent"
              pathWidth={2.5}
              gradientStartColor={muted}
              gradientStopColor={muted}
              duration={1.2}
              delay={0.9}
              repeat={0}
            />
          )}
        </div>

        <div className="wire-node">
          <span className="wire-icon buyers" ref={buyers}>
            <i />
            <i />
            <i />
          </span>
          <span className="wire-label">Buyers</span>
        </div>

        <div className="wire-node">
          <span className="wire-icon edge" ref={edge} />
          <span className="wire-label">Edge</span>
        </div>

        <div className="wire-node">
          <span className="wire-icon apps" ref={apps}>
            <i />
            <i />
          </span>
          <span className="wire-label">App ×2</span>
        </div>

        <div className="wire-node">
          <span className={`wire-icon stock${remaining === 0 ? ' empty' : ''}`} ref={stock}>
            <b>{remaining}</b>
          </span>
          <span className="wire-label">Stock row</span>
          {turnedAway && <span className="wire-409">409 · sold out</span>}
        </div>
      </div>

      <dl className="wire-stats">
        <div>
          <dt>Accepted</dt>
          <dd className="in">{result ? result.sold : '—'}</dd>
        </div>
        <div>
          <dt>Turned away</dt>
          <dd className="out">{result ? result.soldOut : '—'}</dd>
        </div>
        <div>
          <dt>Round trip</dt>
          <dd>{latencyMs !== null ? `${latencyMs} ms` : '—'}</dd>
        </div>
        <div>
          <dt>In stock</dt>
          <dd>
            {remaining}/{total}
          </dd>
        </div>
      </dl>
    </section>
  )
}
