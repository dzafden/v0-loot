import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ImdbRating = {
  rating: number
  votes: number
}

type RawRatingMap = Record<string, [rating: number, votes: number]>
type ImdbRatingMap = Map<number, ImdbRating>

const ImdbRatingsContext = createContext<ImdbRatingMap>(new Map())
let ratingsPromise: Promise<ImdbRatingMap> | null = null

function loadRatings() {
  if (ratingsPromise) return ratingsPromise
  ratingsPromise = fetch('/data/imdb-tv-ratings.json')
    .then((response) => {
      if (!response.ok) throw new Error(`IMDb ratings failed: ${response.status}`)
      return response.json() as Promise<RawRatingMap>
    })
    .then((payload) => new Map(
      Object.entries(payload).map(([id, [rating, votes]]) => [Number(id), { rating, votes }]),
    ))
    .catch(() => new Map())
  return ratingsPromise
}

export function ImdbRatingsProvider({ children }: { children: ReactNode }) {
  const [ratings, setRatings] = useState<ImdbRatingMap>(new Map())

  useEffect(() => {
    let active = true
    void loadRatings().then((next) => {
      if (active) setRatings(next)
    })
    return () => {
      active = false
    }
  }, [])

  return <ImdbRatingsContext.Provider value={ratings}>{children}</ImdbRatingsContext.Provider>
}

export function useImdbRating(showId?: number | null) {
  const ratings = useContext(ImdbRatingsContext)
  return useMemo(() => showId == null ? undefined : ratings.get(showId), [ratings, showId])
}
