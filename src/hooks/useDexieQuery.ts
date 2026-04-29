import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

/**
 * Subscribe to a Dexie query that reacts to writes on any of its tables.
 * `tables` is unused at runtime — Dexie tracks dependencies automatically
 * via liveQuery — we accept it so call sites stay explicit/readable.
 */
export function useDexieQuery<T>(
  _tables: string[],
  query: () => Promise<T> | T,
  initial: T,
  deps: unknown[] = [],
): T {
  const [data, setData] = useState<T>(initial)
  useEffect(() => {
    const sub = liveQuery(() => Promise.resolve(query())).subscribe({
      next: (val) => setData(val as T),
      error: (err) => console.error('useDexieQuery error', err),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return data
}
