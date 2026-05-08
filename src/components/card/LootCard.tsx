import { memo, useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import type { EmojiCategory, Show, Tier } from '../../types'
import { rarityStyle, type Rarity } from '../../lib/rarity'
import { TIER_STYLE } from '../../lib/rarity'
import { imgUrl } from '../../lib/tmdb'

export type CardActionType = 'none' | 'add' | 'remove'

interface Props {
  show: Show
  rarity: Rarity
  tier?: Tier | null
  emojiBadges?: EmojiCategory[]
  episodeProgress?: { watched: number; total: number }
  /** When false, the card renders as a square thumbnail (no nameplate). */
  compact?: boolean
  /** When set, renders an action button on the nameplate. */
  actionType?: CardActionType
  isSelected?: boolean
  onAction?: (s: Show) => void
  onTap?: (s: Show) => void
  onLongPress?: (s: Show, anchor: { x: number; y: number }) => void
  /** Disable mouse-follow tilt (e.g. while dragging). */
  disableTilt?: boolean
}

function LootCardInner({
  show,
  rarity,
  tier,
  emojiBadges = [],
  episodeProgress,
  compact = false,
  actionType = 'none',
  isSelected = false,
  onAction,
  onTap,
  onLongPress,
  disableTilt = false,
}: Props) {
  const r = rarityStyle(rarity)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isAdding, setIsAdding] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disableTilt || compact) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const xR = 8 * ((y - rect.height / 2) / (rect.height / 2))
    const yR = -8 * ((x - rect.width / 2) / (rect.width / 2))
    setTilt({ x: xR, y: yR })
  }

  // Long-press detection (mobile)
  let longPressTimer: number | null = null
  const startLongPress = (anchor: { x: number; y: number }) => {
    if (longPressTimer) clearTimeout(longPressTimer)
    longPressTimer = window.setTimeout(() => {
      onLongPress?.(show, anchor)
    }, 450)
  }
  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer)
  }

  const handleAction = () => {
    if (actionType === 'add') {
      setIsAdding(true)
      setTimeout(() => setIsAdding(false), 150)
    }
    onAction?.(show)
  }

  return (
    <div
      onClick={() => onTap?.(show)}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress?.(show, { x: e.clientX, y: e.clientY })
      }}
      onPointerDown={(e) => startLongPress({ x: e.clientX, y: e.clientY })}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={() => {
        cancelLongPress()
        setTilt({ x: 0, y: 0 })
      }}
      onMouseMove={handleMouseMove}
      className={`relative group cursor-pointer w-full ${compact ? 'aspect-square' : 'aspect-[3/4]'} rounded-[24px] z-10 transition-transform duration-150 active:scale-[0.97]`}
      style={{
        transform:
          compact || disableTilt
            ? `scale(${isAdding ? 0.93 : 1})`
            : `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isAdding ? 0.93 : 1})`,
      }}
    >
      <div
        className={`absolute inset-0 rounded-[24px] overflow-hidden bg-[#151117] flex flex-col shadow-[0_16px_42px_rgba(0,0,0,0.45)] ${isSelected ? 'ring-[#f5c453] ring-[3px]' : ''}`}
      >
        <div
          className="absolute -inset-5 opacity-45 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
          style={{ background: `radial-gradient(circle at 50% 35%, ${r.hex}55, transparent 62%)` }}
          aria-hidden
        />
        {/* shine sweep on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20 overflow-hidden rounded-[24px]">
          <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:animate-shine" />
        </div>

        {/* Image */}
        <div className="relative h-full w-full overflow-hidden bg-black">
          {show.posterPath ? (
            <img
              src={imgUrl(show.posterPath, 'w500')}
              alt={show.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-3xl font-black text-white/40">
              {show.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* tier badge */}
          {tier && (
            <div
              className={`absolute top-2 left-2 h-7 w-7 rounded-full grid place-items-center font-black text-[12px] z-30 ${TIER_STYLE[tier]}`}
            >
              {tier}
            </div>
          )}

          {/* episode progress */}
          {episodeProgress && episodeProgress.total > 0 && (
            <div className="absolute top-2 right-2 z-30">
              {episodeProgress.watched >= episodeProgress.total ? (
                <span className="rounded-md bg-[#f5c453] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  ✓
                </span>
              ) : (
                <span className="rounded-md bg-black/65 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold text-white/90">
                  {episodeProgress.watched}/{episodeProgress.total}
                </span>
              )}
            </div>
          )}

          {/* emoji badges */}
          {emojiBadges.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1 z-30">
              {emojiBadges.slice(0, 3).map((e) => (
                <span
                  key={e.id}
                  className="rounded-full bg-black/60 backdrop-blur px-1.5 py-0.5 text-[13px] leading-none ring-1 ring-white/15"
                >
                  {e.emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info bar */}
        {!compact && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end px-3 pb-3 pt-12 bg-gradient-to-t from-black/88 via-black/32 to-transparent">
            <div className="flex justify-between items-end w-full">
              <div className="flex flex-col overflow-hidden pr-2">
                <h3 className="font-black text-white text-[14px] leading-[0.95] tracking-[-0.06em] line-clamp-2">
                  {show.name}
                </h3>
                <span className="text-[10px] font-bold text-white/42 uppercase tracking-widest truncate mt-1">
                  {show.year}
                  {show.year && show.genres?.[0] ? ' • ' : ''}
                  {show.genres?.[0]}
                </span>
              </div>

              {actionType !== 'none' && (
                <button
                  className={`flex-shrink-0 w-9 h-9 rounded-xl font-black transition-all duration-200 flex items-center justify-center ${
                    actionType === 'add'
                      ? isSelected || isAdding
                        ? 'bg-white/8 text-white/30'
                        : 'bg-[#f5c453] text-black hover:bg-[#ffd66f] hover:scale-105 active:scale-95'
                      : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAction()
                  }}
                >
                  {actionType === 'add' ? (
                    isSelected || isAdding ? (
                      <Check size={18} strokeWidth={3} />
                    ) : (
                      <Plus size={20} strokeWidth={4} />
                    )
                  ) : (
                    <X size={16} strokeWidth={3} />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* compact: rarity strip at the bottom */}
        {compact && <div className={`absolute bottom-0 inset-x-0 h-1 ${r.bg}`} />}
      </div>
    </div>
  )
}

export const LootCard = memo(LootCardInner)
