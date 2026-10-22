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

/** How often, at rest, one random buyer is shown buying. */
const IDLE_EVERY_MS = 5000

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
  // Five buyers stand in for the crowd, each with a beam of its own
  // converging on the edge. Refs are fixed in number, so hooks stay stable.
  const buyer0 = useRef<HTMLSpanElement>(null)
  const buyer1 = useRef<HTMLSpanElement>(null)
  const buyer2 = useRef<HTMLSpanElement>(null)
  const buyer3 = useRef<HTMLSpanElement>(null)
  const buyer4 = useRef<HTMLSpanElement>(null)
  const buyers = [buyer0, buyer1, buyer2, buyer3, buyer4]
  const edge = useRef<HTMLSpanElement>(null)
  const apps = useRef<HTMLSpanElement>(null)
  const stock = useRef<HTMLSpanElement>(null)

  const mode: Mode = running ? 'running' : result ? 'settled' : pulse > 0 ? 'single' : 'idle'
  const turnedAway = mode === 'settled' && result !== null && result.soldOut > 0

  // Idle: every few seconds one buyer, chosen at random, buys. Their beam
  // carries a single pass into the edge and on down the trunk, so the wire
  // reads as a live drop even when nobody on this page is pressing Buy.
  const [idle, setIdle] = useState({ tick: 0, buyer: 0 })
  useEffect(() => {
    if (mode !== 'idle') return
    const next = () => setIdle((s) => ({ tick: s.tick + 1, buyer: Math.floor(Math.random() * 5) }))
    const first = window.setTimeout(next, 1500)
    const every = window.setInterval(next, IDLE_EVERY_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [mode])
  // A real purchase by this viewer also travels from one random buyer.
  const [singleBuyer, setSingleBuyer] = useState(0)
  useEffect(() => {
    if (mode === 'single') setSingleBuyer(Math.floor(Math.random() * 5))
  }, [mode, pulse])

  const key = `${mode}-${pulse}-${result ? result.sold : 0}-${idle.tick}`

  // Running: every beam, hard and continuous. Everything else: one pass,
  // the segments lighting one after another so the eye follows the request
  // from the buyer to the stock row.
  const beam =
    mode === 'running'
      ? { duration: 2, repeat: Infinity, repeatDelay: 0.2, width: 2.5 }
      : { duration: 2, repeat: 0, repeatDelay: 0, width: mode === 'idle' ? 2 : 2.5 }
  const stagger = mode === 'running' ? 0.35 : 0.6
  // Which buyers' beams carry the pass: all of them for a stampede or its
  // result, one of them for a single purchase, nobody before the first tick.
  const litBuyer = mode === 'idle' ? (idle.tick === 0 ? -1 : idle.buyer) : mode === 'single' ? singleBuyer : null
  const trunkLit = mode === 'running' || mode === 'settled' || litBuyer !== null && litBuyer >= 0

  // The trunk after the edge. The buyer beams come first, all at once.
  const segments: [RefObject<HTMLSpanElement | null>, RefObject<HTMLSpanElement | null>][] = [
    [edge, apps],
    [apps, stock],
  ]
  // Bend each buyer's beam toward the middle, as Magic UI's own example
  // does: the control point sits below a high start and above a low one.
  const mid = (buyers.length - 1) / 2
  const curvatureFor = (i: number) => (i - mid) * 42

  return (
    <section ref={ref} className="wire" aria-label="How a purchase travels" data-mode={mode}>
      <div className="wire-row" ref={rowRef} aria-hidden="true">
        {/* Static fallback, shown only under prefers-reduced-motion. */}
        <span className="wire-line" />

        <div className="wire-beams text-(--control)" key={key}>
          {buyers.map((from, i) => {
            const lit = litBuyer === null || litBuyer === i
            return (
              <AnimatedBeam
                key={`buyer-${i}`}
                containerRef={rowRef}
                fromRef={asEl(from)}
                toRef={asEl(edge)}
                curvature={curvatureFor(i)}
                pathColor="currentColor"
                pathOpacity={0.5}
                pathWidth={beam.width}
                gradientStartColor={lit ? copper : 'transparent'}
                gradientStopColor={lit ? copper : 'transparent'}
                duration={beam.duration}
                delay={mode === 'running' ? i * 0.12 : 0}
                repeat={beam.repeat}
                repeatDelay={beam.repeatDelay}
              />
            )
          })}
          {segments.map(([from, to], i) => (
            <AnimatedBeam
              key={i}
              containerRef={rowRef}
              fromRef={asEl(from)}
              toRef={asEl(to)}
              pathColor="currentColor"
              pathOpacity={0.5}
              pathWidth={beam.width}
              gradientStartColor={trunkLit ? copper : 'transparent'}
              gradientStopColor={trunkLit ? copper : 'transparent'}
              duration={beam.duration}
              delay={(i + 1) * stagger}
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
              duration={1.6}
              delay={3 * stagger + 1.3}
              repeat={0}
            />
          )}
        </div>

        <div className="wire-node wire-node-buyers">
          <span className="wire-buyers">
            {buyers.map((r, i) => (
              <span className="wire-icon buyer" ref={r} key={i}>
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="5" r="3" />
                  <path d="M2.5 14.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
                </svg>
              </span>
            ))}
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
