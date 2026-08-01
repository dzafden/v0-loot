import type { EarnedFranchiseAchievement } from '../types'
import { franchiseDisplayName } from './franchise-achievements'
import { dominantColor } from './dominantColor'
import { imgUrl } from './tmdb'

export type CollectionShareFormat = 'story' | 'square'

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function createCollectionShareFile(
  achievement: EarnedFranchiseAchievement,
  format: CollectionShareFormat,
) {
  const width = 1080
  const height = format === 'story' ? 1920 : 1080
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  const definition = achievement.definition
  const heroPath = definition.backdropPath
    ?? definition.members.find((member) => member.backdropPath)?.backdropPath
    ?? definition.posterPath
    ?? definition.members.find((member) => member.posterPath)?.posterPath
  const heroUrl = heroPath ? imgUrl(heroPath, 'original') : undefined
  const accent = heroUrl ? await dominantColor(heroUrl) : '#f5c453'

  ctx.fillStyle = '#08070a'
  ctx.fillRect(0, 0, width, height)
  if (heroUrl) {
    try {
      const image = await loadImage(heroUrl)
      drawCover(ctx, image, width, height)
    } catch {
      // The colour field and type composition remain a complete share artifact.
    }
  }

  const wash = ctx.createLinearGradient(0, 0, width, height)
  wash.addColorStop(0, `${accent}8c`)
  wash.addColorStop(0.48, 'rgba(8,7,10,0.08)')
  wash.addColorStop(1, 'rgba(8,7,10,0.82)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)
  const shade = ctx.createLinearGradient(0, height * 0.22, 0, height)
  shade.addColorStop(0, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.94)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, width, height)

  const padding = 76
  const title = franchiseDisplayName(definition.name)
  const allMovies = definition.members.every((member) => (member.mediaType ?? 'movie') === 'movie')
  const noun = definition.source === 'tmdb-studio' && !allMovies ? 'titles' : 'films'
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 112px Arial, sans-serif'
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, title, width - padding * 2).slice(0, 3)
  const titleY = height - (format === 'story' ? 590 : 470)
  lines.forEach((line, index) => ctx.fillText(line, padding, titleY + index * 104))

  ctx.fillStyle = accent === '#ffffff' ? '#f5c453' : accent
  ctx.font = 'italic 900 190px Arial, sans-serif'
  ctx.fillText(String(definition.memberIds.length), padding, titleY - 205)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = '700 34px Arial, sans-serif'
  ctx.fillText(`You've seen every ${title} ${noun}.`, padding, height - 150)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '700 25px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('LOOT', width - padding, height - 148)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Export failed')), 'image/png')
  })
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return new File([blob], `loot-${safeTitle}-${format}.png`, { type: 'image/png' })
}

export async function shareCollectionAchievement(
  achievement: EarnedFranchiseAchievement,
  format: CollectionShareFormat,
) {
  const file = await createCollectionShareFile(achievement, format)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: franchiseDisplayName(achievement.definition.name) })
    return 'shared' as const
  }
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded' as const
}
