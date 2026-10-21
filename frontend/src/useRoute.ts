import { useCallback, useEffect, useState } from 'react'

export type View = 'home' | 'backend'

const viewOf = (path: string): View => (path.replace(/\/+$/, '') === '/backend' ? 'backend' : 'home')
export const pathOf = (view: View) => (view === 'backend' ? '/backend' : '/')

/**
 * Two pages, one bundle. The history API rather than a router: nginx and
 * Vite both fall back to index.html, so /backend loads directly too.
 */
export function useRoute(): { view: View; go: (view: View) => void } {
  const [view, setView] = useState<View>(() => viewOf(location.pathname))

  useEffect(() => {
    const onPop = () => setView(viewOf(location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((next: View) => {
    if (viewOf(location.pathname) !== next) history.pushState(null, '', pathOf(next) + location.search)
    setView(next)
    window.scrollTo({ top: 0 })
  }, [])

  return { view, go }
}
