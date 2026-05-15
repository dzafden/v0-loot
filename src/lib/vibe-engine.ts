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
    id: 'family_trauma',
    title: 'Family Trauma',
    subtitle: 'Generational scars, conflict, and messy bonds.',
    tokensAny: ['family', 'mother', 'father', 'sibling', 'grief', 'abuse', 'dysfunctional', 'trauma', 'secrets'],
    requiredAny: ['trauma', 'abuse', 'grief', 'dysfunctional', 'secrets'],
    forbiddenAny: ['sitcom', 'parody', 'anthology comedy'],
    allowedGenresAny: ['Drama', 'Crime', 'Thriller', 'Mystery'],
    tokenPairs: [['family', 'trauma'], ['family', 'secrets'], ['grief', 'family']],
    genreBoost: ['Drama'],
  },
  {
    id: 'enemies_to_lovers_tension',
    title: 'Enemies to Lovers Tension',
    subtitle: 'Rivals, banter, and unresolved chemistry.',
    tokensAny: ['rivalry', 'enemies', 'forbidden love', 'romance', 'obsession', 'triangle', 'tension', 'chemistry'],
    requiredAny: ['romance', 'love', 'chemistry', 'forbidden love'],
    forbiddenAny: ['procedural', 'true crime', 'documentary'],
    allowedGenresAny: ['Drama', 'Comedy', 'Romance'],
    tokenPairs: [['rival', 'romance'], ['enemies', 'love'], ['forbidden', 'relationship']],
    genreBoost: ['Drama', 'Comedy', 'Romance'],
  },
  {
    id: 'peak_2010s_nostalgia',
    title: 'Peak 2010s Nostalgia',
    subtitle: 'That specific 2010s cultural texture.',
    tokensAny: ['high school', 'teen', 'coming of age', 'social media', 'viral', 'party'],
    requiredAny: ['high school', 'teen', 'coming of age'],
    forbiddenAny: ['medieval', 'period drama'],
    allowedGenresAny: ['Drama', 'Comedy', 'Romance'],
    genreBoost: ['Drama', 'Comedy'],
    yearMin: 2010,
    yearMax: 2019,
  },
  {
    id: 'competence_porn',
    title: 'Competence Porn',
    subtitle: 'Hyper-capable people solving hard problems.',
    tokensAny: ['detective', 'lawyer', 'doctor', 'forensic', 'investigation', 'mastermind', 'heist', 'consultant', 'expert'],
    requiredAny: ['detective', 'investigation', 'forensic', 'lawyer', 'doctor', 'heist', 'expert'],
    forbiddenAny: ['slice of life', 'reality tv'],
    allowedGenresAny: ['Crime', 'Drama', 'Mystery', 'Action'],
    tokenPairs: [['genius', 'case'], ['investigation', 'expert'], ['heist', 'plan']],
    genreBoost: ['Crime', 'Drama', 'Mystery', 'Action'],
  },
  {
    id: 'cozy_autumn_background_noise',
    title: 'Cozy Autumn Background Noise',
    subtitle: 'Warm, rewatchable comfort with low chaos.',
    tokensAny: ['small town', 'family', 'friendship', 'cozy', 'cafe', 'life', 'warm', 'slice of life'],
    requiredAny: ['cozy', 'small town', 'slice of life', 'friendship', 'warm'],
    forbiddenAny: ['murder', 'serial killer', 'war', 'crime syndicate', 'violence'],
    allowedGenresAny: ['Comedy', 'Drama', 'Animation', 'Family'],
    genreBoost: ['Comedy', 'Drama', 'Animation', 'Family'],
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
    id: 'mystery_solving_loop',
    title: 'Mystery Solving Loop',
    subtitle: 'Cases, clues, twists, and weekly puzzles.',
    tokensAny: ['mystery', 'detective', 'case', 'murder', 'investigation', 'evidence', 'suspect'],
    requiredAny: ['mystery', 'detective', 'investigation', 'case'],
    forbiddenAny: ['variety show', 'talk show'],
    allowedGenresAny: ['Mystery', 'Crime', 'Thriller'],
    genreBoost: ['Mystery', 'Crime', 'Thriller'],
  },
  {
    id: 'toxic_but_stylish',
    title: 'Toxic but Stylish',
    subtitle: 'Beautiful people making terrible choices.',
    tokensAny: ['power', 'wealth', 'betrayal', 'scandal', 'obsession', 'elite', 'luxury'],
    requiredAny: ['wealth', 'luxury', 'scandal', 'obsession', 'betrayal'],
    forbiddenAny: ['procedural', 'sitcom'],
    allowedGenresAny: ['Drama', 'Thriller'],
    genreBoost: ['Drama', 'Thriller'],
  },
  {
    id: 'crime_empire_rise_fall',
    title: 'Crime Empire Rise and Fall',
    subtitle: 'Power climbs, loyalty breaks, consequences hit.',
    tokensAny: ['cartel', 'mafia', 'drug', 'crime lord', 'underworld', 'empire', 'kingpin', 'betrayal'],
    requiredAny: ['cartel', 'mafia', 'drug', 'underworld', 'kingpin'],
    allowedGenresAny: ['Crime', 'Drama', 'Thriller'],
    genreBoost: ['Crime', 'Drama'],
  },
  {
    id: 'political_mind_games',
    title: 'Political Mind Games',
    subtitle: 'Manipulation, institutions, and strategic warfare.',
    tokensAny: ['president', 'campaign', 'senate', 'government', 'politics', 'conspiracy', 'power play'],
    requiredAny: ['government', 'politics', 'campaign', 'conspiracy'],
    allowedGenresAny: ['Drama', 'Thriller'],
    genreBoost: ['Drama', 'Thriller'],
  },
  {
    id: 'courtroom_showdowns',
    title: 'Courtroom Showdowns',
    subtitle: 'Law, arguments, and high-stakes verdicts.',
    tokensAny: ['court', 'trial', 'attorney', 'lawyer', 'judge', 'verdict', 'legal'],
    requiredAny: ['court', 'trial', 'attorney', 'lawyer', 'legal'],
    allowedGenresAny: ['Drama', 'Crime'],
    genreBoost: ['Drama', 'Crime'],
  },
  {
    id: 'workplace_chaos_comedy',
    title: 'Workplace Chaos Comedy',
    subtitle: 'Coworker dysfunction with lovable rhythm.',
    tokensAny: ['office', 'workplace', 'coworker', 'boss', 'team', 'daily life', 'awkward'],
    requiredAny: ['office', 'workplace', 'coworker', 'boss'],
    allowedGenresAny: ['Comedy'],
    genreBoost: ['Comedy'],
  },
  {
    id: 'apocalypse_survival',
    title: 'Apocalypse Survival',
    subtitle: 'Collapse, scarcity, and survival choices.',
    tokensAny: ['apocalypse', 'survival', 'zombie', 'post apocalyptic', 'outbreak', 'collapse', 'wasteland'],
    requiredAny: ['apocalypse', 'survival', 'zombie', 'post apocalyptic', 'outbreak'],
    allowedGenresAny: ['Sci-Fi', 'Drama', 'Action', 'Thriller'],
    genreBoost: ['Sci-Fi', 'Action', 'Thriller'],
  },
  {
    id: 'mind_bending_scifi',
    title: 'Mind Bending Sci-Fi',
    subtitle: 'Reality glitches, paradoxes, and big concepts.',
    tokensAny: ['time travel', 'parallel', 'simulation', 'alien', 'future', 'quantum', 'paradox', 'reality'],
    requiredAny: ['time travel', 'parallel', 'simulation', 'paradox', 'reality'],
    allowedGenresAny: ['Sci-Fi', 'Mystery', 'Drama'],
    genreBoost: ['Sci-Fi', 'Mystery'],
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
    id: 'teen_identity_drama',
    title: 'Teen Identity Drama',
    subtitle: 'Growing up, belonging, and social pressure.',
    tokensAny: ['teen', 'high school', 'coming of age', 'identity', 'friend group', 'prom', 'bullying'],
    requiredAny: ['teen', 'high school', 'coming of age'],
    allowedGenresAny: ['Drama', 'Comedy', 'Romance'],
    genreBoost: ['Drama', 'Romance'],
  },
  {
    id: 'wholesome_animation',
    title: 'Wholesome Animation',
    subtitle: 'Warm animated worlds with emotional lift.',
    tokensAny: ['friendship', 'adventure', 'heartwarming', 'magic', 'journey', 'school', 'family'],
    requiredAny: ['friendship', 'heartwarming', 'adventure', 'family'],
    allowedGenresAny: ['Animation', 'Family', 'Adventure'],
    genreBoost: ['Animation', 'Family'],
  },
  {
    id: 'dark_detective_noir',
    title: 'Dark Detective Noir',
    subtitle: 'Grit, obsession, and morally gray investigations.',
    tokensAny: ['detective', 'murder', 'city', 'corruption', 'noir', 'serial killer', 'cold case'],
    requiredAny: ['detective', 'murder', 'corruption', 'serial killer', 'cold case'],
    allowedGenresAny: ['Crime', 'Mystery', 'Thriller', 'Drama'],
    genreBoost: ['Crime', 'Thriller'],
  },
  {
    id: 'historical_palace_intrigue',
    title: 'Historical Palace Intrigue',
    subtitle: 'Court politics, alliances, and succession games.',
    tokensAny: ['kingdom', 'palace', 'dynasty', 'emperor', 'queen', 'succession', 'court'],
    requiredAny: ['kingdom', 'palace', 'dynasty', 'succession', 'court'],
    allowedGenresAny: ['Drama', 'War'],
    genreBoost: ['Drama'],
  },
  {
    id: 'heist_masterplan',
    title: 'Heist Masterplan',
    subtitle: 'Precision crews executing risky plans.',
    tokensAny: ['heist', 'robbery', 'crew', 'plan', 'hostage', 'vault', 'mastermind'],
    requiredAny: ['heist', 'robbery', 'vault', 'mastermind', 'hostage'],
    allowedGenresAny: ['Crime', 'Action', 'Thriller'],
    genreBoost: ['Crime', 'Action'],
  },
  {
    id: 'prestige_slow_burn',
    title: 'Prestige Slow Burn',
    subtitle: 'Patient pacing, layered characters, rich payoffs.',
    tokensAny: ['character study', 'family saga', 'slow burn', 'prestige', 'psychological', 'atmospheric'],
    requiredAny: ['character study', 'slow burn', 'psychological', 'atmospheric'],
    allowedGenresAny: ['Drama', 'Thriller'],
    genreBoost: ['Drama'],
  },
  {
    id: 'monster_of_the_week',
    title: 'Monster of the Week',
    subtitle: 'Episodic threats with a core duo or team.',
    tokensAny: ['monster', 'paranormal', 'case', 'weekly', 'creature', 'demon', 'hunter'],
    requiredAny: ['monster', 'paranormal', 'weekly', 'creature', 'demon'],
    allowedGenresAny: ['Sci-Fi', 'Fantasy', 'Horror', 'Mystery'],
    genreBoost: ['Sci-Fi', 'Fantasy', 'Horror'],
  },
  {
    id: 'relationship_messy_ensemble',
    title: 'Relationship Messy Ensemble',
    subtitle: 'Friend circles, breakups, and emotional whiplash.',
    tokensAny: ['relationship', 'breakup', 'friend group', 'triangle', 'dating', 'betrayal', 'romance'],
    requiredAny: ['relationship', 'triangle', 'dating', 'romance', 'breakup'],
    allowedGenresAny: ['Drama', 'Comedy', 'Romance'],
    genreBoost: ['Drama', 'Romance'],
  },
  {
    id: 'underdog_sports_spirit',
    title: 'Underdog Sports Spirit',
    subtitle: 'Team growth, grit, and comeback energy.',
    tokensAny: ['team', 'coach', 'tournament', 'championship', 'training', 'rival', 'underdog'],
    requiredAny: ['team', 'coach', 'tournament', 'championship', 'underdog'],
    allowedGenresAny: ['Drama', 'Comedy', 'Action'],
    genreBoost: ['Drama'],
  },
]

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

    if (vibe.yearMin != null && vibe.yearMax != null && candidate.year != null) {
      if (candidate.year >= vibe.yearMin && candidate.year <= vibe.yearMax) {
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
