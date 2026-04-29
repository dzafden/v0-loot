import { useState } from 'react'
import { getTmdbKey, setTmdbKey } from '../../lib/tmdb'

export function Settings() {
  const [key, setKey] = useState(getTmdbKey())
  const [saved, setSaved] = useState(false)
  return (
    <div className="px-4 pb-20">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 mt-2">
        <h2 className="font-semibold">TMDB API key</h2>
        <p className="text-xs text-white/55 mt-1 mb-3">
          Loot uses TMDB for show, cast, and episode data. Get a free key at{' '}
          <a
            className="underline"
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noreferrer"
          >
            themoviedb.org
          </a>
          . Stored locally only — never sent anywhere else.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Your v3 API key"
          className="w-full rounded-full bg-white/8 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => {
              setTmdbKey(key)
              setSaved(true)
              setTimeout(() => setSaved(false), 1600)
            }}
            className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold"
          >
            Save
          </button>
          {saved && <span className="text-xs text-emerald-300">Saved.</span>}
        </div>
      </section>
    </div>
  )
}
