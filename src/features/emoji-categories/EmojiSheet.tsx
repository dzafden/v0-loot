import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { Show } from '../../types'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import {
  applyEmoji,
  createEmojiCategory,
  deleteEmojiCategory,
  removeEmoji,
} from '../../data/queries'

const SUGGESTED = ['❤️', '🔥', '💀', '🥶', '😭', '🍔', '🥲', '🌹', '🥀', '👑', '🎯', '🤡', '🧠', '🎲', '🌶️', '⭐']

export function EmojiSheet({ show, onClose }: { show: Show | null; onClose: () => void }) {
  const cats = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')
  if (!show) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 flex flex-col"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-3" />
          <h2 className="text-lg font-bold">Vibe-tag "{show.name}"</h2>
          <p className="text-xs text-white/55 mb-3">
            Pick or create an emoji category. Apply many — a show can be ❤️ AND 🍔 AND 🥀.
          </p>
          <div className="flex flex-wrap gap-2 mb-3 overflow-y-auto">
            {cats.map((c) => {
              const has = c.showIds.includes(show.id)
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    has ? void removeEmoji(c.id, show.id) : void applyEmoji(c.id, show.id)
                  }
                  className={`group rounded-2xl px-2.5 py-1.5 text-sm flex items-center gap-1.5 border ${
                    has
                      ? 'bg-amber-300 text-amber-950 border-amber-200'
                      : 'bg-white/5 text-white/85 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  {c.label && <span className="text-xs">{c.label}</span>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteEmojiCategory(c.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-300/80"
                  >
                    ✕
                  </button>
                </button>
              )
            })}
          </div>
          <div className="border-t border-white/10 pt-3">
            <div className="text-xs uppercase tracking-wider text-white/45 mb-1.5">
              Create new
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {SUGGESTED.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-lg text-xl ${
                    emoji === e ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!emoji.trim()) return
                const cat = await createEmojiCategory(emoji, label.trim() || undefined)
                await applyEmoji(cat.id, show.id)
                setEmoji('')
                setLabel('')
              }}
              className="flex gap-2"
            >
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                placeholder="🥀"
                className="w-16 text-center text-xl rounded-full bg-white/8 px-3 py-2"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (optional)"
                className="flex-1 rounded-full bg-white/8 px-3 py-2 text-sm"
              />
              <button className="rounded-full bg-white text-black px-4 text-sm font-semibold">
                Add
              </button>
            </form>
          </div>
          <button onClick={onClose} className="mt-3 rounded-full bg-white/10 py-2 text-sm">
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
