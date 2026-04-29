import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'loot:ios-install-dismissed'

function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
}
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS-only
    window.navigator.standalone === true
  )
}

export function IOSInstallBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!isIOS() || isStandalone()) return
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setShow(true), 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 inset-x-3 z-40 rounded-2xl bg-zinc-900/95 backdrop-blur border border-white/10 p-3 flex items-start gap-3 shadow-2xl"
        >
          <span className="text-2xl">📲</span>
          <div className="flex-1 text-sm">
            <div className="font-semibold">Add Loot to your home screen</div>
            <div className="text-[11px] text-white/55 mt-0.5">
              Tap <span className="font-semibold">Share</span> → <span className="font-semibold">Add to Home Screen</span>.
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, '1')
              setShow(false)
            }}
            className="text-xs text-white/55"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
