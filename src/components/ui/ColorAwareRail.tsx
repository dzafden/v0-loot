import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function ColorAwareRail({
  imageSrc,
  className,
  children,
}: {
  imageSrc: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('relative overflow-hidden border-t border-white/[0.14] bg-[#111416]', className)}>
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute inset-[-24px] h-[calc(100%+48px)] w-[calc(100%+48px)] max-w-none scale-110 object-cover opacity-100 blur-xl saturate-[2] brightness-[0.68] contrast-[1.08]"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(5,7,8,0.18),rgba(5,7,8,0.46))]" />
      <div className="relative z-10" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.92)' }}>
        {children}
      </div>
    </div>
  )
}
