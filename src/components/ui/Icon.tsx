// Tiny inline SVG icon set. No emoji.
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

const wrap =
  (path: React.ReactNode) =>
  ({ size = 20, ...rest }: Props) =>
    (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {path}
      </svg>
    )

export const IconPlus = wrap(<><path d="M12 5v14" /><path d="M5 12h14" /></>)
export const IconSearch = wrap(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const IconFilter = wrap(<><path d="M3 6h18" /><path d="M7 12h10" /><path d="M11 18h2" /></>)
export const IconMenu = wrap(<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>)
export const IconClose = wrap(<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>)
export const IconBack = wrap(<><path d="M15 6l-6 6 6 6" /></>)
export const IconStar = wrap(
  <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />,
)
export const IconGrid = wrap(
  <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
)
export const IconTrophy = wrap(
  <><path d="M8 4h8v4a4 4 0 0 1-8 0V4z" /><path d="M8 6H5v2a3 3 0 0 0 3 3" /><path d="M16 6h3v2a3 3 0 0 1-3 3" /><path d="M10 14h4v3h-4z" /><path d="M8 21h8" /></>,
)
export const IconFolder = wrap(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />)
export const IconMask = wrap(
  <><path d="M4 5c4 0 6 2 8 2s4-2 8-2v6a8 8 0 1 1-16 0V5z" /><circle cx="9" cy="11" r="1" /><circle cx="15" cy="11" r="1" /></>,
)
export const IconGear = wrap(
  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1V9a1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.1a1 1 0 0 0-.9.6z" /></>,
)
export const IconCheck = wrap(<path d="M5 13l4 4L19 7" />)
export const IconArrowDown = wrap(<><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>)
export const IconArrowUp = wrap(<><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>)
export const IconClock = wrap(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const IconEye = wrap(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>)
