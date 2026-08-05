import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers3, Share2, X } from 'lucide-react'
import type { EarnedFranchiseAchievement } from '../../types'
import { collectionFrequencyTreatment, franchiseRootName } from '../../lib/franchise-achievements'
import { dominantColor } from '../../lib/dominantColor'
import { imgUrl } from '../../lib/tmdb'
import { shareCollectionAchievement, type CollectionShareFormat } from '../../lib/collection-share'
import { useReducedMotion } from '../../hooks/useReducedMotion'

function readableAccent(hex: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!match) return '#f5c453'
  const rgb = match.slice(1).map((value) => Number.parseInt(value, 16))
  const luminance = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114
  const amount = luminance < 118 ? 0.48 : luminance < 150 ? 0.26 : 0.08
  const adjusted = rgb.map((value) => Math.round(value + (255 - value) * amount))
  return `#${adjusted.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export function CollectionCompletionReveal({
  achievement,
  onDismiss,
  onViewCollection,
}: {
  achievement: EarnedFranchiseAchievement | null
  onDismiss: () => void
  onViewCollection: (achievement: EarnedFranchiseAchievement) => void
}) {
  const reducedMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const holoFrame = useRef<number | null>(null)
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

  useEffect(() => () => {
    if (holoFrame.current !== null) cancelAnimationFrame(holoFrame.current)
  }, [])

  const visibleAccent = heroUrl ? readableAccent(accent) : '#f5c453'

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

  const title = definition ? franchiseRootName(definition.name) : ''
  const count = definition?.memberIds.length ?? 0
  const intensity = collectionFrequencyTreatment(count)
  const restingFoil = intensity === 'heirloom' ? 0.62 : intensity === 'sunday' ? 0.5 : 0.38

  const setCardPoint = useCallback((clientX: number, clientY: number, active: boolean) => {
    if (reducedMotion || !cardRef.current) return
    const card = cardRef.current
    const bounds = card.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width))
    const y = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height))
    card.style.setProperty('--mx', `${x * 100}%`)
    card.style.setProperty('--my', `${y * 100}%`)
    card.style.setProperty('--rx', `${(0.5 - y) * 13}deg`)
    card.style.setProperty('--ry', `${(x - 0.5) * 13}deg`)
    card.style.setProperty('--shadow-x', `${(0.5 - x) * 22}px`)
    card.style.setProperty('--shadow-y', `${28 + (0.5 - y) * 18}px`)
    card.style.setProperty('--glare-opacity', active ? '0.9' : '0.32')
    card.style.setProperty('--foil-opacity', active ? '0.92' : String(restingFoil))
  }, [reducedMotion, restingFoil])

  const moveCard = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    const { clientX, clientY } = event
    if (holoFrame.current !== null) cancelAnimationFrame(holoFrame.current)
    holoFrame.current = requestAnimationFrame(() => setCardPoint(clientX, clientY, true))
  }

  const resetCard = () => {
    const card = cardRef.current
    if (!card || reducedMotion) return
    card.style.setProperty('--mx', '50%')
    card.style.setProperty('--my', '42%')
    card.style.setProperty('--rx', '0deg')
    card.style.setProperty('--ry', '0deg')
    card.style.setProperty('--card-scale', '1')
    card.style.setProperty('--shadow-x', '0px')
    card.style.setProperty('--shadow-y', '34px')
    card.style.setProperty('--glare-opacity', '0.24')
    card.style.setProperty('--foil-opacity', String(restingFoil))
  }

  const pressCard = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.style.setProperty('--card-scale', '0.985')
    setCardPoint(event.clientX, event.clientY, true)
  }

  const releaseCard = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (event.pointerType === 'mouse') event.currentTarget.style.setProperty('--card-scale', '1')
    else resetCard()
  }

  const holoStyle = {
    '--mx': '50%',
    '--my': '42%',
    '--rx': '0deg',
    '--ry': '0deg',
    '--card-scale': '1',
    '--shadow-x': '0px',
    '--shadow-y': '34px',
    '--glare-opacity': reducedMotion ? '0.12' : '0.24',
    '--foil-opacity': reducedMotion ? String(restingFoil * 0.58) : String(restingFoil),
    transform: 'perspective(980px) rotateX(var(--rx)) rotateY(var(--ry)) scale(var(--card-scale))',
    boxShadow: `var(--shadow-x) var(--shadow-y) 86px rgba(0,0,0,.76), 0 0 ${intensity === 'heirloom' ? 74 : 44}px ${visibleAccent}38`,
  } as CSSProperties

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
          {heroUrl && <motion.img src={heroUrl} alt="" initial={reducedMotion ? false : { scale: 1.18 }} animate={{ scale: 1.12 }} transition={{ duration: reducedMotion ? 0 : 1.3, ease: [0.2, 0.8, 0.2, 1] }} className="absolute inset-[-8%] h-[116%] w-[116%] object-cover opacity-30 blur-[22px] saturate-[1.35]" aria-hidden />}
          <div className="absolute inset-0 bg-black/58" aria-hidden />
          <div className="absolute inset-0 opacity-75" style={{ background: `radial-gradient(circle at 50% 42%, ${visibleAccent}45 0%, transparent 54%)` }} aria-hidden />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_18%,rgba(6,7,9,.42)_66%,#060709_100%)]" aria-hidden />

          <button onClick={onDismiss} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/[0.12] bg-black/38 text-white/82 backdrop-blur-xl active:scale-95" aria-label="Close collection recognition">
            <X size={19} />
          </button>

          <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(4.75rem,env(safe-area-inset-top))]">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 36, scale: 0.86, rotate: -2.5 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18, delay: reducedMotion ? 0 : 0.12 }}
              className="relative w-full max-w-[350px]"
            >
              <div
                ref={cardRef}
                onPointerEnter={moveCard}
                onPointerMove={moveCard}
                onPointerLeave={resetCard}
                onPointerDown={pressCard}
                onPointerUp={releaseCard}
                onPointerCancel={resetCard}
                className="relative aspect-[3/4.12] w-full touch-none cursor-grab overflow-hidden rounded-[30px] bg-[#111216] ring-1 ring-white/35 will-change-transform transition-[transform,box-shadow] duration-200 ease-out active:cursor-grabbing"
                style={holoStyle}
              >
                {heroUrl && <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover saturate-[1.12]" aria-hidden />}
                <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-transparent to-black/94" aria-hidden />
                <div
                  className="pointer-events-none absolute inset-[-20%] mix-blend-color-dodge transition-opacity duration-150"
                  style={{
                    opacity: 'var(--foil-opacity)',
                    backgroundImage: `linear-gradient(115deg, transparent 17%, rgba(255,88,190,.62) 32%, rgba(255,244,176,.82) 41%, ${visibleAccent}bb 49%, rgba(89,227,255,.72) 58%, rgba(137,102,255,.5) 65%, transparent 76%), repeating-linear-gradient(122deg, rgba(255,78,184,.34) 0 2px, rgba(255,227,116,.2) 3px 5px, rgba(86,232,255,.3) 6px 8px, transparent 9px 14px)`,
                    backgroundSize: '210% 210%, 34px 34px',
                    backgroundPosition: 'var(--mx) var(--my), var(--mx) var(--my)',
                    filter: 'brightness(1.16) saturate(1.65)',
                  }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-150"
                  style={{ opacity: 'var(--glare-opacity)', background: `radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0%, ${visibleAccent}aa 12%, rgba(255,255,255,.2) 29%, transparent 50%)` }}
                  aria-hidden
                />
                <div className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-screen bg-[repeating-linear-gradient(118deg,transparent_0px,transparent_8px,rgba(255,255,255,.48)_9px,transparent_10px)]" aria-hidden />
                <div className="pointer-events-none absolute inset-[1px] rounded-[29px] ring-1 ring-inset ring-white/28" aria-hidden />
                {!reducedMotion && intensity !== 'everyday' && <motion.div initial={{ x: '-150%' }} animate={{ x: '180%' }} transition={{ duration: 0.95, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }} className="pointer-events-none absolute inset-y-[-10%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/34 to-transparent mix-blend-color-dodge" aria-hidden />}

                <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-5">
                  <h2 id="collection-reveal-title" className="max-w-[96%] text-[32px] font-black leading-[0.88] tracking-[-0.065em] text-balance drop-shadow-[0_3px_16px_rgba(0,0,0,.95)]">{title}</h2>
                  <p className="mt-3 text-[11px] font-semibold tracking-[0.04em] text-white/54" aria-label={`${count} of ${count} titles`}>{count}/{count}</p>
                </div>
              </div>
            </motion.div>

            <div className="mt-4 grid w-full max-w-[350px] grid-cols-2 gap-2.5">
              <button onClick={() => onViewCollection(achievement)} className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/[0.1] bg-white/[0.07] text-[10px] font-black uppercase tracking-[0.12em] text-white/72 backdrop-blur-xl active:scale-[0.985]">
                <Layers3 size={15} /> View titles
              </button>
              <button onClick={() => void share('story')} disabled={sharing !== null} className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-white text-[10px] font-black uppercase tracking-[0.12em] text-black active:scale-[0.985] disabled:opacity-55" aria-label={sharing === 'story' ? 'Preparing share card' : 'Share card'}>
                <Share2 size={15} /> {sharing === 'story' ? 'Preparing' : 'Share card'}
              </button>
            </div>
            <div className="mt-2 min-h-4 text-center text-[10px] font-semibold text-white/42" role="status">{shareMessage}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
