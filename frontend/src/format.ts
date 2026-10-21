export function formatPrice(pence: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100)
}

const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

const shortTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

export function formatOpensAt(iso: string): string {
  return longDate.format(new Date(iso))
}

export function formatOpensAtShort(iso: string): string {
  return shortTime.format(new Date(iso))
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "04:59" or "1:04:59". */
export function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor(secs / 60) % 60
  const s = secs % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Spoken at minute granularity so the timer label does not churn. */
export function spokenCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  if (secs < 60) return 'Opens in under a minute'
  const h = Math.floor(secs / 3600)
  const m = Math.floor(secs / 60) % 60
  const parts = []
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  return `Opens in ${parts.join(', ')}`
}

export function padUnit(unit: number): string {
  return String(unit).padStart(3, '0')
}
