import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RectangleVertical, Share2, X } from 'lucide-react'
import type { EarnedFranchiseAchievement } from '../../types'
import { collectionFrequencyTreatment, franchiseDisplayName } from '../../lib/franchise-achievements'
import { dominantColor } from '../../lib/dominantColor'
import { imgUrl } from '../../lib/tmdb'
import { shareCollectionAchievement, type CollectionShareFormat } from '../../lib/collection-share'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function CollectionCompletionReveal({
  achievement,
  onDismiss,
}: {
  achievement: EarnedFranchiseAchievement | null
  onDismiss: () => void
}) {
  const reducedMotion = useReducedMotion()
  const [accent, setAccent] = useState('#f5c453')
  const [sharing, setSharing] = useState<CollectionShareFormat | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const definition = achievement?.definition
  const heroPath = definition?.backdropPath
    ?? definition?.members.find((member) => member.backdropPath)?.backdropPath
    ?? definition?.posterPath
  const heroUrl = heroPath ? imgUrl(heroPath, 'original') : undefined

  useEffect(() => {
    if (!achievement) return
    navigator.vibrate?.([8, 24, 12])
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [achievement, onDismiss])

  useEffect(() => {
    if (!heroUrl) return
    let active = true
    dominantColor(heroUrl).then((color) => {
      if (active) setAccent(color)
    })
    return () => { active = false }
  }, [heroUrl])

  const visibleAccent = heroUrl ? accent : '#f5c453'

  const share = async (format: CollectionShareFormat) => {
    if (!achievement || sharing) return
    setSharing(format)
    setShareMessage('')
    try {
      const result = await shareCollectionAchievement(achievement, format)
      setShareMessage(result === 'shared' ? 'Shared' : 'Saved to downloads')
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') setShareMessage('Could not export this card')
    } finally {
      setSharing(null)
    }
  }

  const title = definition ? franchiseDisplayName(definition.name) : ''
  const allMovies = definition?.members.every((member) => (member.mediaType ?? 'movie') === 'movie') ?? true
  const noun = allMovies ? 'film' : 'title'
  const count = definition?.memberIds.length ?? 0
  const intensity = collectionFrequencyTreatment(count)

  return (
    <AnimatePresence>
      {achievement && definition && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.22 }}
          className="fixed inset-0 z-[120] overflow-hidden bg-[#060709] text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="collection-reveal-title"
        >
          {heroUrl && <motion.img src={heroUrl} alt="" initial={reducedMotion ? false : { scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: reducedMotion ? 0 : 1.1, ease: [0.2, 0.8, 0.2, 1] }} className="absolute inset-0 h-full w-full object-cover" aria-hidden />}
          <div className="absolute inset-0 opacity-65" style={{ background: `linear-gradient(128deg, ${visibleAccent} 0%, transparent 50%)` }} aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-black/16 via-black/18 to-black/96" aria-hidden />
          {intensity !== 'everyday' && <motion.div initial={reducedMotion ? false : { x: '-120%' }} animate={{ x: '140%' }} transition={{ duration: reducedMotion ? 0 : intensity === 'heirloom' ? 1.1 : 0.75, delay: 0.28 }} className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/16 to-transparent" aria-hidden />}

          <button onClick={onDismiss} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/[0.12] bg-black/38 text-white/82 backdrop-blur-xl active:scale-95" aria-label="Close collection recognition">
            <X size={19} />
          </button>

          <div className="relative z-10 flex min-h-svh flex-col justify-end px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 44, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 190, damping: 18, delay: reducedMotion ? 0 : 0.15 }}
              className="text-[132px] font-black italic leading-[0.66] tracking-[-0.12em] text-white [-webkit-text-stroke:2px_rgba(0,0,0,.72)]"
              style={{ textShadow: `0 0 ${intensity === 'heirloom' ? 44 : 20}px ${visibleAccent}, 8px 10px 0 rgba(0,0,0,.5)` }}
            >{count}</motion.p>
            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.48, delay: reducedMotion ? 0 : 0.34 }}>
              <h2 id="collection-reveal-title" className="mt-5 max-w-[94%] text-[48px] font-black leading-[0.82] tracking-[-0.095em] text-balance">{title}</h2>
              <p className="mt-5 max-w-[330px] text-[21px] font-semibold leading-[1.12] tracking-[-0.035em] text-white/88">You've seen every {title} {noun}.</p>
              <p className="mt-3 text-[12px] font-medium text-white/42">This is part of your record now.</p>
            </motion.div>

            <div className="mt-8 grid grid-cols-2 gap-2.5">
              <button onClick={() => void share('story')} disabled={sharing !== null} className="flex h-14 items-center justify-center gap-2 rounded-[22px] bg-white text-[11px] font-black uppercase tracking-[0.13em] text-black active:scale-[0.985] disabled:opacity-55">
                <RectangleVertical size={16} /> {sharing === 'story' ? 'Preparing' : 'Share story'}
              </button>
              <button onClick={() => void share('square')} disabled={sharing !== null} className="flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/[0.12] bg-black/36 text-[11px] font-black uppercase tracking-[0.13em] text-white backdrop-blur-xl active:scale-[0.985] disabled:opacity-55">
                <Share2 size={16} /> {sharing === 'square' ? 'Preparing' : 'Share square'}
              </button>
            </div>
            <div className="mt-3 min-h-5 text-center text-[11px] font-semibold text-white/48" role="status">{shareMessage}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
