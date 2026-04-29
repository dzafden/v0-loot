// Extract dominant color from an image via Canvas API.
// Used for default card outline color when user hasn't picked one.

const cache = new Map<string, string>()

export async function dominantColor(src: string): Promise<string> {
  if (cache.has(src)) return cache.get(src)!
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const w = (canvas.width = 24)
        const h = (canvas.height = 36)
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve('#ffffff')
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a < 128) continue
          const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
          // skip near-black and near-white pixels for a more vivid pick
          if (lum < 24 || lum > 232) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        if (!count) return resolve('#ffffff')
        const hex = '#' + [r, g, b].map((v) =>
          Math.round(v / count).toString(16).padStart(2, '0'),
        ).join('')
        cache.set(src, hex)
        resolve(hex)
      } catch {
        resolve('#ffffff')
      }
    }
    img.onerror = () => resolve('#ffffff')
    img.src = src
  })
}

export function useDominantColor(src: string | undefined): string | null {
  // Lightweight: read sync cache; trigger fetch lazily.
  if (!src) return null
  return cache.get(src) ?? null
}

export function primeDominantColor(src: string) {
  if (src && !cache.has(src)) void dominantColor(src)
}
