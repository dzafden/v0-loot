import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { X } from 'lucide-react'
import { getTmdbKey, setTmdbKey } from '../../lib/tmdb'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsSheet({ open, onClose }: Props) {
  const [key, setKey] = useState(getTmdbKey())
  const [saved, setSaved] = useState(false)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl bg-[#0f0f13] border-t border-white/10 p-5 pb-8"
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Settings</h2>
              <button
                onClick={onClose}
                className="grid place-items-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-black uppercase tracking-tight">TMDB API key</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                Loot uses TMDB for show, cast, and episode data. Stored locally only.{' '}
                <a
                  className="underline text-zinc-400 hover:text-white"
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noreferrer"
                >
                  Get a free key
                </a>
                .
              </p>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="v3 API key"
                className="w-full rounded-xl bg-white/[0.06] px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => {
                    setTmdbKey(key)
                    setSaved(true)
                    setTimeout(() => setSaved(false), 1500)
                  }}
                  className="rounded-xl bg-[#4ade80] text-black px-4 h-10 text-sm font-black uppercase tracking-widest"
                >
                  Save
                </button>
                {saved && (
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Saved
                  </span>
                )}
              </div>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
