import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_GAP_MS = 3000

/**
 * One polite live region that never floods. Each key is announced at most
 * once. Ordinary announcements keep a minimum gap and always speak the
 * latest text; urgent ones (sold out, your own result) go out immediately.
 */
export function useAnnouncer() {
  const [text, setText] = useState('')
  const spoken = useRef(new Set<string>())
  const lastAt = useRef(0)
  const pending = useRef<number | undefined>(undefined)

  const say = useCallback((key: string, message: string, urgent = false) => {
    if (spoken.current.has(key)) return
    spoken.current.add(key)

    const emit = () => {
      lastAt.current = Date.now()
      setText(message)
    }

    window.clearTimeout(pending.current)
    const wait = urgent ? 0 : Math.max(0, lastAt.current + MIN_GAP_MS - Date.now())
    if (wait === 0) emit()
    else pending.current = window.setTimeout(emit, wait)
  }, [])

  useEffect(() => () => window.clearTimeout(pending.current), [])

  return { text, say }
}
