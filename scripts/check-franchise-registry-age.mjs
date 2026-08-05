import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const REGISTRY_PATH = resolve('src/data/generated/franchise-registry.json')
const MAX_AGE_DAYS = 120
const DAY_MS = 24 * 60 * 60 * 1000

const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'))
const generatedAt = Date.parse(registry.generatedAt)
const now = process.env.LOOT_REGISTRY_CHECK_NOW
  ? Date.parse(process.env.LOOT_REGISTRY_CHECK_NOW)
  : Date.now()

if (!Number.isFinite(generatedAt)) {
  process.stderr.write(
    `[registry] Warning: ${REGISTRY_PATH} has no valid generatedAt timestamp. Run npm run build:franchises.\n`,
  )
} else if (!Number.isFinite(now)) {
  throw new Error('LOOT_REGISTRY_CHECK_NOW must be a valid date when provided')
} else {
  const ageDays = Math.max(0, Math.floor((now - generatedAt) / DAY_MS))
  const generatedLabel = new Date(generatedAt).toISOString().slice(0, 10)
  if (ageDays > MAX_AGE_DAYS) {
    process.stderr.write(
      `[registry] Warning: franchise registry is ${ageDays} days old (generated ${generatedLabel}). `
      + `Quarterly refresh is overdue; run npm run build:franchises.\n`,
    )
  } else {
    process.stdout.write(
      `[registry] Franchise registry is ${ageDays} days old (generated ${generatedLabel}); `
      + `${MAX_AGE_DAYS - ageDays} days remain before refresh is due.\n`,
    )
  }
}
