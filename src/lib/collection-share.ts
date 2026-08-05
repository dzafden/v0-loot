import type { EarnedFranchiseAchievement } from '../types'
import { franchiseDisplayName, franchiseRootName } from './franchise-achievements'
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function readableAccent(hex: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!match) return '#f5c453'
  const rgb = match.slice(1).map((value) => Number.parseInt(value, 16))
  const luminance = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114
  const amount = luminance < 118 ? 0.48 : luminance < 150 ? 0.26 : 0.08
  const adjusted = rgb.map((value) => Math.round(value + (255 - value) * amount))
  return `#${adjusted.map((value) => value.toString(16).padStart(2, '0')).join('')}`
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
  const accent = readableAccent(heroUrl ? await dominantColor(heroUrl) : '#f5c453')
  let heroImage: HTMLImageElement | null = null
  if (heroUrl) {
    try {
      heroImage = await loadImage(heroUrl)
    } catch {
      heroImage = null
    }
  }

  ctx.fillStyle = '#08070a'
  ctx.fillRect(0, 0, width, height)
  if (heroImage) {
    ctx.save()
    ctx.filter = 'blur(34px) saturate(1.35)'
    ctx.globalAlpha = 0.38
    drawCover(ctx, heroImage, width, height)
    ctx.restore()
  }
  ctx.fillStyle = 'rgba(6,7,9,0.68)'
  ctx.fillRect(0, 0, width, height)
  const aura = ctx.createRadialGradient(width / 2, height * 0.46, 40, width / 2, height * 0.46, width * 0.66)
  aura.addColorStop(0, `${accent}55`)
  aura.addColorStop(0.55, `${accent}16`)
  aura.addColorStop(1, 'rgba(6,7,9,0)')
  ctx.fillStyle = aura
  ctx.fillRect(0, 0, width, height)

  const cardWidth = format === 'story' ? 780 : 700
  const cardHeight = Math.round(cardWidth * 1.373)
  const cardX = (width - cardWidth) / 2
  const cardY = (height - cardHeight) / 2
  const cardRadius = 62
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.72)'
  ctx.shadowBlur = 80
  ctx.shadowOffsetY = 36
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
  ctx.fillStyle = '#111216'
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
  ctx.clip()
  if (heroImage) {
    ctx.save()
    ctx.translate(cardX, cardY)
    drawCover(ctx, heroImage, cardWidth, cardHeight)
    ctx.restore()
  }
  else {
    const fallback = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight)
    fallback.addColorStop(0, accent)
    fallback.addColorStop(1, '#111216')
    ctx.fillStyle = fallback
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
  }
  const shade = ctx.createLinearGradient(0, cardY, 0, cardY + cardHeight)
  shade.addColorStop(0, 'rgba(0,0,0,0.3)')
  shade.addColorStop(0.48, 'rgba(0,0,0,0.02)')
  shade.addColorStop(1, 'rgba(0,0,0,0.96)')
  ctx.fillStyle = shade
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
  const foil = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight)
  foil.addColorStop(0.1, 'rgba(255,255,255,0)')
  foil.addColorStop(0.3, 'rgba(255,106,196,0.22)')
  foil.addColorStop(0.4, 'rgba(255,244,190,0.38)')
  foil.addColorStop(0.48, `${accent}62`)
  foil.addColorStop(0.57, 'rgba(105,229,255,0.3)')
  foil.addColorStop(0.7, 'rgba(255,255,255,0)')
  foil.addColorStop(0.86, `${accent}30`)
  foil.addColorStop(0.9, 'rgba(255,255,255,0)')
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = foil
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
  const glare = ctx.createRadialGradient(cardX + cardWidth * 0.68, cardY + cardHeight * 0.28, 0, cardX + cardWidth * 0.68, cardY + cardHeight * 0.28, cardWidth * 0.64)
  glare.addColorStop(0, 'rgba(255,255,255,0.48)')
  glare.addColorStop(0.2, `${accent}38`)
  glare.addColorStop(0.55, 'rgba(255,255,255,0.04)')
  glare.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glare
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
  ctx.restore()

  ctx.save()
  roundedRect(ctx, cardX + 1, cardY + 1, cardWidth - 2, cardHeight - 2, cardRadius)
  ctx.strokeStyle = 'rgba(255,255,255,0.42)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()

  const padding = 46
  const title = franchiseRootName(definition.name)
  const bottom = cardY + cardHeight - padding
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 66px Arial, sans-serif'
  const lines = wrapText(ctx, title, cardWidth - padding * 2).slice(0, 3)
  const lineHeight = 62
  const titleY = bottom - lines.length * lineHeight - 38
  lines.forEach((line, index) => ctx.fillText(line, cardX + padding, titleY + index * lineHeight))
  ctx.fillStyle = 'rgba(255,255,255,0.56)'
  ctx.font = '600 22px Arial, sans-serif'
  const count = definition.memberIds.length
  ctx.fillText(`${count}/${count}`, cardX + padding, bottom - 22)

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
    await navigator.share({ files: [file], title: franchiseDisplayName(achievement.definition) })
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
