import { useState, type FormEvent } from 'react'
import { formatOpensAtShort } from '../format'
import type { Moment, Phase } from '../types'

interface Props {
  phase: Phase
  moment: Moment
  opensAt: string
  onBuy: (buyerName: string) => void
}

export function BuyForm({ phase, moment, opensAt, onBuy }: Props) {
  const [name, setName] = useState('')
  const disabled = phase === 'loading' || phase === 'before' || moment === 'pending'
  const label =
    phase === 'loading'
      ? 'Loading'
      : phase === 'before'
        ? `Opens at ${formatOpensAtShort(opensAt)}`
        : moment === 'pending'
          ? 'Reserving…'
          : 'Buy one'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (disabled) return
    onBuy(name.trim())
  }

  return (
    <form className="buy" aria-label="Buy" onSubmit={submit}>
      <div className="field">
        <label htmlFor="buyer">Your name</label>
        <input
          id="buyer"
          name="buyer"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button type="submit" disabled={disabled}>
        {label}
      </button>
    </form>
  )
}
