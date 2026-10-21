import type { MouseEvent } from 'react'
import { pathOf, type View } from '../useRoute'

interface Props {
  view: View
  go: (view: View) => void
}

const ITEMS: { view: View; label: string }[] = [
  { view: 'home', label: 'Home' },
  { view: 'backend', label: 'Backend' },
]

export function Nav({ view, go }: Props) {
  const follow = (next: View) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    go(next)
  }
  return (
    <nav className="nav" aria-label="Primary">
      {ITEMS.map((item) => (
        <a key={item.view} href={pathOf(item.view)} aria-current={view === item.view ? 'page' : undefined} onClick={follow(item.view)}>
          {item.label}
        </a>
      ))}
    </nav>
  )
}
