import { useMemo } from 'react'
import { chooseClient } from './api'
import { DropPage } from './components/DropPage'

export default function App() {
  const client = useMemo(chooseClient, [])
  return <DropPage client={client} />
}
