import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.resolve(root, process.argv[2] || '../watching/web/data/pool.json')
const output = path.resolve(root, 'public/data/imdb-tv-ratings.json')
const catalog = JSON.parse(fs.readFileSync(source, 'utf8'))

const ratings = Object.fromEntries(
  Object.values(catalog)
    .filter((show) => Number.isFinite(show?.rating) && show.rating > 0)
    .map((show) => [String(show.id), [show.rating, show.votes || 0]]),
)

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, JSON.stringify(ratings))
console.log(`Wrote ${Object.keys(ratings).length} IMDb ratings to ${output}`)
