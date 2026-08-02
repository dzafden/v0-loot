import type { TmdbShowDetail, TmdbSearchResult } from './tmdb'

export interface VibeCandidate {
  id: number
  title: string
  overview: string
  genreNames: string[]
  year?: number
  networkIds: number[]
  keywords: string[]
  popularity?: number
}

export interface VibeScore {
  vibeId: string
  vibeTitle: string
  score: number
  evidence: string[]
}

export interface ShowVibeProfile {
  showId: number
  title: string
  vibes: VibeScore[]
}

export interface VibeCrate {
  vibeId: string
  vibeTitle: string
  subtitle: string
  shows: Array<{ id: number; title: string; score: number; evidence: string[] }>
  totalMatches?: number
  page?: number
  pageSize?: number
  hasMore?: boolean
}

interface VibeDefinition {
  id: string
  title: string
  subtitle: string
  tokensAny: string[]
  tokenPairs?: Array<[string, string]>
  genreBoost?: string[]
  requiredAny?: string[]
  forbiddenAny?: string[]
  allowedGenresAny?: string[]
  yearMin?: number
  yearMax?: number
  networkBoostIds?: number[]
}

const VIBES: VibeDefinition[] = [
  {
    id: 'shounen_escalation', title: 'Shounen Escalation',
    subtitle: 'Training arcs, rivals, power jumps, and impossible stakes.',
    tokensAny: ['training', 'rival', 'tournament', 'power', 'battle', 'warrior', 'hero', 'quest'],
    requiredAny: ['training', 'rival', 'tournament', 'battle', 'warrior'],
    allowedGenresAny: ['Animation', 'Action', 'Adventure', 'Fantasy'],
    tokenPairs: [['training', 'power'], ['rival', 'battle']], genreBoost: ['Action', 'Adventure'],
  },
  {
    id: 'slice_of_life_cozy', title: 'Slice-of-Life Cozy',
    subtitle: 'Small days, warm company, and gentle emotional weather.',
    tokensAny: ['slice of life', 'daily life', 'friendship', 'school', 'cafe', 'village', 'cozy', 'peaceful'],
    requiredAny: ['slice of life', 'daily life', 'friendship', 'cozy', 'peaceful'],
    forbiddenAny: ['serial killer', 'apocalypse', 'war'],
    allowedGenresAny: ['Animation', 'Comedy', 'Drama', 'Family'], genreBoost: ['Comedy', 'Family'],
  },
  {
    id: 'isekai_power_fantasy', title: 'Isekai Power Fantasy',
    subtitle: 'Another world, new rules, and an overpowered second life.',
    tokensAny: ['another world', 'reincarnated', 'transported', 'fantasy world', 'video game', 'summoned', 'demon lord', 'adventurer'],
    requiredAny: ['another world', 'reincarnated', 'transported', 'summoned', 'video game'],
    allowedGenresAny: ['Animation', 'Fantasy', 'Adventure', 'Sci-Fi'], genreBoost: ['Fantasy', 'Adventure'],
  },
  {
    id: 'dark_fantasy_grim', title: 'Dark Fantasy & Grim Worlds',
    subtitle: 'Curses, monsters, sacrifice, and worlds with sharp teeth.',
    tokensAny: ['curse', 'demon', 'monster', 'blood', 'revenge', 'dark fantasy', 'war', 'death'],
    requiredAny: ['curse', 'demon', 'monster', 'dark fantasy', 'blood'],
    forbiddenAny: ['preschool'], allowedGenresAny: ['Animation', 'Fantasy', 'Horror', 'Action'],
    genreBoost: ['Fantasy', 'Horror'],
  },
  {
    id: 'adult_animation_cynical', title: 'Adult Animation, Sharp Edges',
    subtitle: 'Satire, bad decisions, and jokes with consequences.',
    tokensAny: ['satire', 'adult animation', 'dysfunctional', 'workplace', 'parody', 'alcohol', 'politics', 'cynical'],
    requiredAny: ['satire', 'adult animation', 'dysfunctional', 'parody', 'cynical'],
    forbiddenAny: ['preschool'], allowedGenresAny: ['Animation', 'Comedy'],
    genreBoost: ['Comedy'], networkBoostIds: [19, 47, 80],
  },
  {
    id: 'cartoon_nostalgia', title: 'Cartoon Nostalgia',
    subtitle: 'After-school energy and characters that never left.',
    tokensAny: ['cartoon', 'childhood', 'school', 'siblings', 'adventure', 'neighborhood', 'classic'],
    requiredAny: ['cartoon', 'childhood', 'school', 'adventure', 'classic'],
    allowedGenresAny: ['Animation', 'Kids', 'Family', 'Comedy'], genreBoost: ['Family', 'Comedy'],
    yearMax: 2009,
  },
  {
    id: 'stop_motion_craft', title: 'Stop-Motion Craft',
    subtitle: 'Handmade worlds where every frame has fingerprints.',
    tokensAny: ['stop motion', 'clay animation', 'claymation', 'puppet animation', 'handmade', 'miniature'],
    requiredAny: ['stop motion', 'clay animation', 'claymation', 'puppet animation'],
    allowedGenresAny: ['Animation', 'Family', 'Fantasy'], genreBoost: ['Animation'],
  },
  {
    id: 'sports_underdog', title: 'Sports Underdog',
    subtitle: 'Practice, teamwork, rivalries, and the comeback point.',
    tokensAny: ['team', 'coach', 'tournament', 'championship', 'training', 'rival', 'underdog', 'sports'],
    requiredAny: ['team', 'coach', 'tournament', 'training', 'sports'],
    allowedGenresAny: ['Animation', 'Drama', 'Comedy', 'Action'], tokenPairs: [['team', 'training']], genreBoost: ['Drama'],
  },
  {
    id: 'mecha_scifi', title: 'Mecha & Machine Futures',
    subtitle: 'Pilots, giant machines, and technology under pressure.',
    tokensAny: ['mecha', 'robot', 'pilot', 'space', 'cyberpunk', 'android', 'machine', 'future'],
    requiredAny: ['mecha', 'robot', 'pilot', 'android', 'cyberpunk'],
    allowedGenresAny: ['Animation', 'Sci-Fi', 'Action'], tokenPairs: [['pilot', 'robot']], genreBoost: ['Sci-Fi', 'Action'],
  },
  {
    id: 'magical_girl', title: 'Magical Girl Transformations',
    subtitle: 'Secret powers, chosen friendships, and transformation sparkle.',
    tokensAny: ['magical girl', 'transformation', 'magic', 'guardian', 'princess', 'schoolgirl', 'chosen'],
    requiredAny: ['magical girl', 'transformation', 'guardian', 'schoolgirl'],
    allowedGenresAny: ['Animation', 'Fantasy', 'Action'], genreBoost: ['Fantasy'],
  },
  {
    id: 'psychological_mindbend', title: 'Psychological Mindbend',
    subtitle: 'Fractured reality, unreliable minds, and lingering questions.',
    tokensAny: ['psychological', 'surreal', 'memory', 'identity', 'reality', 'dream', 'paranoia', 'experiment'],
    requiredAny: ['psychological', 'surreal', 'memory', 'reality', 'paranoia'],
    allowedGenresAny: ['Animation', 'Mystery', 'Thriller', 'Sci-Fi'], genreBoost: ['Mystery', 'Thriller'],
  },
  {
    id: 'found_family',
    title: 'Found Family',
    subtitle: 'A chosen crew becomes home.',
    tokensAny: ['friendship', 'team', 'crew', 'orphan', 'group', 'bond', 'together'],
    requiredAny: ['friendship', 'team', 'crew', 'group', 'bond'],
    forbiddenAny: ['anthology', 'stand-up'],
    allowedGenresAny: ['Adventure', 'Action', 'Animation', 'Sci-Fi', 'Drama'],
    tokenPairs: [['team', 'family'], ['crew', 'bond']],
    genreBoost: ['Adventure', 'Action', 'Animation', 'Sci-Fi'],
  },
  {
    id: 'comfort_rewatch_classics',
    title: 'Comfort Rewatch Classics',
    subtitle: 'Familiar rhythms you can revisit anytime.',
    tokensAny: ['friends', 'family', 'sitcom', 'daily life', 'apartment', 'school', 'neighborhood'],
    requiredAny: ['sitcom', 'friends', 'family', 'neighborhood'],
    forbiddenAny: ['serial killer', 'war'],
    allowedGenresAny: ['Comedy', 'Family'],
    genreBoost: ['Comedy', 'Family'],
  },
  {
    id: 'art_house_animation', title: 'Art-House Animation',
    subtitle: 'Painterly, experimental, and formally strange.',
    tokensAny: ['experimental', 'surreal', 'hand drawn', 'independent', 'anthology', 'dream', 'art', 'poetic'],
    requiredAny: ['experimental', 'surreal', 'hand drawn', 'independent', 'poetic'],
    allowedGenresAny: ['Animation', 'Drama', 'Fantasy'], genreBoost: ['Drama'],
  },
  {
    id: 'superhero_animated', title: 'Animated Superheroes',
    subtitle: 'Masks, powers, teams, and comic-book momentum.',
    tokensAny: ['superhero', 'secret identity', 'villain', 'powers', 'masked', 'comic book', 'justice'],
    requiredAny: ['superhero', 'secret identity', 'villain', 'comic book'],
    allowedGenresAny: ['Animation', 'Action', 'Adventure'], genreBoost: ['Action', 'Adventure'],
  },
  {
    id: 'kids_all_ages', title: 'All-Ages Adventure',
    subtitle: 'Big imagination that works for kids and grown-ups.',
    tokensAny: ['family', 'children', 'friendship', 'adventure', 'magic', 'animals', 'school', 'imagination'],
    requiredAny: ['family', 'children', 'friendship', 'adventure', 'animals'],
    forbiddenAny: ['adult animation', 'serial killer'],
    allowedGenresAny: ['Animation', 'Family', 'Kids', 'Adventure'], genreBoost: ['Family', 'Adventure'],
  },
  {
    id: 'romance_yearning', title: 'Romance & Yearning',
    subtitle: 'Crushes, almost-confessions, and slow emotional payoff.',
    tokensAny: ['romance', 'love', 'crush', 'relationship', 'yearning', 'school', 'couple', 'confession'],
    requiredAny: ['romance', 'love', 'crush', 'relationship', 'confession'],
    allowedGenresAny: ['Animation', 'Romance', 'Drama', 'Comedy'], genreBoost: ['Romance', 'Drama'],
  },
  {
    id: 'horror_animated', title: 'Animated Horror',
    subtitle: 'Nightmares, body horror, ghosts, and uncanny frames.',
    tokensAny: ['horror', 'ghost', 'monster', 'curse', 'haunted', 'nightmare', 'body horror', 'demon'],
    requiredAny: ['horror', 'ghost', 'curse', 'haunted', 'nightmare'],
    allowedGenresAny: ['Animation', 'Horror', 'Thriller'], genreBoost: ['Horror', 'Thriller'],
  },
]

const VIBE_CHIP_TITLES: Record<string, string> = {
  shounen_escalation: 'Shounen',
  slice_of_life_cozy: 'Cozy',
  isekai_power_fantasy: 'Isekai',
  dark_fantasy_grim: 'Dark Fantasy',
  adult_animation_cynical: 'Sharp Edges',
  cartoon_nostalgia: 'Nostalgia',
  stop_motion_craft: 'Stop-Motion',
  sports_underdog: 'Underdog',
  mecha_scifi: 'Mecha',
  magical_girl: 'Magical Girl',
  psychological_mindbend: 'Mindbend',
  found_family: 'Found Family',
  comfort_rewatch_classics: 'Comfort',
  art_house_animation: 'Art-House',
  superhero_animated: 'Superheroes',
  kids_all_ages: 'All-Ages',
  romance_yearning: 'Romance',
  horror_animated: 'Horror',
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

function hasToken(text: string, token: string): boolean {
  return text.includes(norm(token))
}

function yearFromDate(firstAirDate?: string): number | undefined {
  if (!firstAirDate || firstAirDate.length < 4) return undefined
  const y = Number(firstAirDate.slice(0, 4))
  return Number.isFinite(y) ? y : undefined
}

export function buildVibeCandidate(
  raw: TmdbSearchResult,
  detail: TmdbShowDetail,
  keywords: { id: number; name: string }[],
): VibeCandidate {
  return {
    id: raw.id,
    title: raw.name,
    overview: detail.overview ?? raw.overview ?? '',
    genreNames: (detail.genres ?? []).map((g) => g.name),
    year: yearFromDate(detail.first_air_date ?? raw.first_air_date),
    networkIds: (detail.networks ?? []).map((n) => n.id),
    keywords: keywords.map((k) => k.name),
    popularity: raw.popularity,
  }
}

export function scoreShowVibes(candidate: VibeCandidate): ShowVibeProfile {
  const text = norm([candidate.overview, ...candidate.keywords].join(' '))
  const genres = new Set(candidate.genreNames)
  const networks = new Set(candidate.networkIds)

  const vibes: VibeScore[] = VIBES.map((vibe) => {
    let raw = 0
    const evidence: string[] = []
    const hasAllowedGenre =
      !vibe.allowedGenresAny || vibe.allowedGenresAny.some((g) => genres.has(g))
    const hasRequired =
      !vibe.requiredAny || vibe.requiredAny.some((token) => hasToken(text, token))
    const hasForbidden = (vibe.forbiddenAny ?? []).some((token) => hasToken(text, token))

    for (const token of vibe.tokensAny) {
      if (hasToken(text, token)) {
        raw += 1.0
        if (evidence.length < 4) evidence.push(`token:${token}`)
      }
    }

    for (const pair of vibe.tokenPairs ?? []) {
      if (hasToken(text, pair[0]) && hasToken(text, pair[1])) {
        raw += 1.4
        if (evidence.length < 4) evidence.push(`pair:${pair[0]}+${pair[1]}`)
      }
    }

    if (vibe.genreBoost?.some((g) => genres.has(g))) {
      raw += 0.8
      evidence.push('genre-boost')
    }

    if ((vibe.yearMin != null || vibe.yearMax != null) && candidate.year != null) {
      if ((vibe.yearMin == null || candidate.year >= vibe.yearMin) && (vibe.yearMax == null || candidate.year <= vibe.yearMax)) {
        raw += 1.2
        evidence.push(`year:${candidate.year}`)
      }
    }

    if (vibe.networkBoostIds?.some((id) => networks.has(id))) {
      raw += 0.7
      evidence.push('network-boost')
    }

    if (!hasAllowedGenre) raw *= 0.45
    if (!hasRequired) raw *= 0.28
    if (hasForbidden) raw *= 0.2

    const maxRaw = Math.max(2, vibe.tokensAny.length * 0.55)
    const score = Math.max(0, Math.min(1, raw / maxRaw))

    return {
      vibeId: vibe.id,
      vibeTitle: vibe.title,
      score: Number(score.toFixed(4)),
      evidence,
    }
  })

  vibes.sort((a, b) => b.score - a.score)
  return {
    showId: candidate.id,
    title: candidate.title,
    vibes,
  }
}

export function buildVibeCrates(
  candidates: VibeCandidate[],
  opts: { minScore?: number; maxPerCrate?: number } = {},
): VibeCrate[] {
  const minScore = opts.minScore ?? 0.55
  const maxPerCrate = opts.maxPerCrate ?? 8

  const profiles = candidates.map(scoreShowVibes)

  const crates: VibeCrate[] = VIBES.map((vibe) => {
    const items = profiles
      .map((p) => {
        const match = p.vibes.find((v) => v.vibeId === vibe.id)
        return match
          ? {
              id: p.showId,
              title: p.title,
              score: match.score,
              evidence: match.evidence,
            }
          : null
      })
      .filter((x): x is { id: number; title: string; score: number; evidence: string[] } => !!x)
      .filter((x) => x.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPerCrate)

    return {
      vibeId: vibe.id,
      vibeTitle: vibe.title,
      subtitle: vibe.subtitle,
      shows: items,
    }
  })

  return crates.filter((c) => c.shows.length > 0)
}

export function getSupportedVibes() {
  return VIBES.map((v) => ({ id: v.id, title: v.title, subtitle: v.subtitle }))
}

export function getVibeTitle(vibeId: string | undefined) {
  return VIBES.find((vibe) => vibe.id === vibeId)?.title
}

export function getVibeSubtitle(vibeId: string | undefined) {
  return VIBES.find((vibe) => vibe.id === vibeId)?.subtitle
}

export function getVibeChipTitle(vibeId: string | undefined) {
  return vibeId ? VIBE_CHIP_TITLES[vibeId] ?? getVibeTitle(vibeId) : undefined
}
