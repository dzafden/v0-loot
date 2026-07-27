import type { AnimationTradition, CardDescriptor } from '../types'

export type { CardDescriptor } from '../types'

export interface CardDescriptorInput {
  overview?: string
  keywords?: string[]
  genreNames?: string[]
  tradition?: AnimationTradition
}

export interface CardDescriptorContext {
  /** Descriptor concepts already communicated by the surrounding row or surface. */
  excludeIds?: string[]
}

type EvidenceSource = 'keyword' | 'overview' | 'genre'

interface ConceptHit {
  source: EvidenceSource
  value: string
  strength: number
}

type ConceptId = keyof typeof CONCEPT_ALIASES

interface DescriptorRule {
  id: string
  label: string
  all?: ConceptId[]
  any?: ConceptId[]
  minAny?: number
  genreAny?: string[]
  traditionAny?: AnimationTradition[]
  priority: number
}

interface GenreDescriptorRule {
  id: string
  label: string
  all: GenreConcept[]
}

type GenreConcept = keyof typeof GENRE_ALIASES

const CONCEPT_ALIASES = {
  samurai: ['samurai', 'ronin'],
  timeTravel: ['time travel', 'time traveler', 'travels through time', 'sent through time', 'sent back in time', 'back in time', 'time machine', 'time portal', 'displaced to the distant future'],
  magic: ['magic', 'magical', 'sorcery', 'spellcasting'],
  parallelWorlds: ['parallel world', 'parallel worlds', 'parallel universe', 'parallel universes', 'alternate universe', 'alternate universes', 'multiple dimensions', 'multiverse', 'another dimension', 'other dimensions', 'dimension hopping', 'interdimensional', 'interdimensional travel'],
  invention: ['inventor', 'inventors', 'invention', 'inventions', 'inventing', 'science experiment'],
  child: ['child', 'children', 'kid', 'kids', 'boy', 'girl', 'teenage inventor'],
  surreal: ['surreal', 'absurdist', 'absurd'],
  workplace: ['workplace', 'co workers', 'coworkers', 'office', 'employees', 'job at', 'jobs as', 'mundane jobs', 'groundskeeper', 'groundskeepers'],
  postApocalyptic: ['post apocalyptic', 'post apocalypse', 'after the apocalypse'],
  fantasy: ['fantasy', 'magical world', 'fantasy world'],
  cosmic: ['cosmic', 'outer space', 'space', 'universe', 'across the universe', 'intergalactic', 'extraterrestrial', 'interdimensional beings'],
  comingOfAge: ['coming of age', 'growing up', 'adolescence', 'self discovery'],
  slapstick: ['slapstick', 'physical comedy'],
  stopMotion: ['stop motion', 'clay animation', 'claymation', 'puppet animation'],
  socialSatire: ['social satire', 'political satire', 'cultural satire'],
  satire: ['satire', 'satirical'],
  magicalGirl: ['magical girl', 'mahō shōjo', 'mahou shoujo'],
  isekai: ['isekai', 'reincarnated in another world', 'transported to another world', 'summoned to another world'],
  mecha: ['mecha', 'giant robot', 'giant robots', 'mobile suit', 'mobile suits'],
  giantMachine: ['giant machine', 'giant machines', 'giant robot', 'giant robots', 'mobile suit', 'mobile suits'],
  pilot: ['pilot', 'pilots', 'piloting', 'piloted'],
  shounen: ['shounen', 'shōnen'],
  training: ['training arc', 'combat training', 'martial arts training', 'trains to become'],
  rivalry: ['rival', 'rivals', 'rivalry'],
  tournament: ['tournament', 'championship'],
  powerProgression: ['power progression', 'grows stronger', 'become stronger', 'new powers'],
  superhero: ['superhero', 'superheroes', 'super hero', 'super heroes', 'comic book hero'],
  dailyLife: ['daily life', 'everyday life', 'family life', 'day to day'],
  family: ['family', 'parents', 'siblings'],
  city: ['city neighborhood', 'urban neighborhood', 'inner city', 'city life'],
  childhood: ['childhood', 'school kid', 'school kids', 'growing up'],
  darkFantasy: ['dark fantasy', 'grim fantasy'],
  robot: ['robot', 'robotic', 'android', 'mechanical companion'],
  scientist: ['scientist', 'mad scientist', 'genius scientist', 'laboratory', 'science genius'],
  summer: ['summer', 'summer vacation', 'summer holiday'],
  project: ['project', 'projects', 'builds', 'building inventions'],
  supernatural: ['supernatural', 'paranormal', 'haunted', 'ghost', 'ghosts', 'occult'],
  monsterHunting: ['monster hunt', 'monster hunter', 'monster hunters', 'hunts monsters', 'fights monsters', 'slays demons', 'demon hunter'],
  martialArts: ['martial arts', 'kung fu', 'karate', 'taekwondo'],
  vampire: ['vampire', 'vampires', 'dracula'],
  food: ['chef', 'cooking', 'restaurant', 'culinary'],
  school: ['school', 'academy', 'classmates', 'students'],
  fantasySignal: ['demon king', 'mage', 'witch', 'wizard', 'dragon', 'fairy', 'magic potion', 'enchanted'],
  afterlife: ['afterlife', 'lingering souls', 'angels guide', 'land of the dead'],
  fantasyRealm: ['cloud kingdom', 'magical kingdom', 'fantasy kingdom', 'enchanted kingdom'],
  gaming: ['video game', 'video games', 'gamer', 'gaming'],
  warfare: ['warfare', 'great war', 'epic battle', 'war between', 'battle unfolds'],
  irreverent: ['irreverent', 'subversive humor', 'offensive humor', 'provocative comedy'],
} as const

const GENRE_ALIASES = {
  action: ['action', 'action adventure'],
  adventure: ['adventure', 'action adventure'],
  comedy: ['comedy'],
  crime: ['crime'],
  drama: ['drama'],
  family: ['family', 'kids'],
  fantasy: ['fantasy'],
  horror: ['horror'],
  mystery: ['mystery'],
  romance: ['romance'],
  scifi: ['sci fi', 'science fiction'],
  speculative: ['sci fi fantasy'],
  thriller: ['thriller'],
  western: ['western'],
} as const

const RULES: DescriptorRule[] = [
  { id: 'time_travel_samurai', label: 'Time-Travel Samurai', all: ['timeTravel', 'samurai'], priority: 124 },
  { id: 'dimension_hopping_magic', label: 'Dimension-Hopping Magic', all: ['parallelWorlds', 'magic'], priority: 122 },
  { id: 'dimension_hopping_comedy', label: 'Dimension-Hopping Comedy', all: ['parallelWorlds'], genreAny: ['Comedy'], priority: 120 },
  { id: 'cosmic_mad_science', label: 'Cosmic Mad Science', all: ['scientist', 'cosmic'], priority: 118 },
  { id: 'time_travel_robot', label: 'Time-Travel Robot', all: ['timeTravel', 'robot'], priority: 116 },
  { id: 'kid_inventors', label: 'Kid Inventors', all: ['invention', 'child'], priority: 112 },
  { id: 'surreal_workplace', label: 'Surreal Workplace', all: ['surreal', 'workplace'], priority: 110 },
  { id: 'summer_projects', label: 'Summer Projects', all: ['summer', 'project'], priority: 109 },
  { id: 'magic_comedy', label: 'Magic Comedy', all: ['magic'], genreAny: ['Comedy'], priority: 109 },
  { id: 'afterlife_comedy', label: 'Afterlife Comedy', all: ['afterlife'], genreAny: ['Comedy'], priority: 109 },
  { id: 'fantasy_comedy', label: 'Fantasy Comedy', all: ['fantasySignal'], genreAny: ['Comedy'], priority: 109 },
  { id: 'paranormal_mystery', label: 'Paranormal Mystery', all: ['supernatural'], genreAny: ['Mystery'], priority: 108 },
  { id: 'summer_mystery', label: 'Summer Mystery', all: ['summer'], genreAny: ['Mystery'], priority: 107 },
  { id: 'post_apocalyptic_fantasy', label: 'Post-Apocalyptic Fantasy', all: ['postApocalyptic', 'fantasy'], genreAny: ['Fantasy', 'Sci-Fi & Fantasy'], priority: 108 },
  { id: 'cosmic_coming_of_age', label: 'Cosmic Coming-of-Age', all: ['cosmic', 'comingOfAge'], priority: 106 },
  { id: 'city_childhood', label: 'City Childhood', all: ['city', 'childhood'], priority: 104 },
  { id: 'everyday_family_life', label: 'Everyday Family Life', all: ['dailyLife', 'family'], priority: 102 },
  { id: 'social_satire', label: 'Social Satire', all: ['socialSatire'], priority: 100 },
  { id: 'stop_motion', label: 'Stop-Motion', all: ['stopMotion'], priority: 98 },
  { id: 'slapstick', label: 'Slapstick', all: ['slapstick'], priority: 96 },
  { id: 'magical_girl', label: 'Magical Girl', all: ['magicalGirl'], priority: 94 },
  { id: 'isekai', label: 'Isekai', all: ['isekai'], traditionAny: ['anime'], priority: 92 },
  { id: 'mecha', label: 'Mecha', all: ['mecha'], priority: 90 },
  { id: 'mecha', label: 'Mecha', all: ['giantMachine', 'pilot'], priority: 89 },
  { id: 'shounen', label: 'Shounen', all: ['shounen'], traditionAny: ['anime'], priority: 88 },
  {
    id: 'shounen',
    label: 'Shounen',
    any: ['training', 'rivalry', 'tournament', 'powerProgression'],
    minAny: 2,
    genreAny: ['Action', 'Action & Adventure'],
    traditionAny: ['anime'],
    priority: 86,
  },
  { id: 'irreverent_comedy', label: 'Irreverent Comedy', all: ['irreverent'], genreAny: ['Comedy'], priority: 84 },
  { id: 'superhero', label: 'Superhero', all: ['superhero'], priority: 82 },
  { id: 'samurai_action', label: 'Samurai Action', all: ['samurai'], genreAny: ['Action', 'Action & Adventure'], priority: 82 },
  { id: 'monster_hunting', label: 'Monster Hunting', all: ['monsterHunting'], priority: 81 },
  { id: 'martial_arts', label: 'Martial Arts', all: ['martialArts'], priority: 80 },
  { id: 'vampire_horror', label: 'Vampire Horror', all: ['vampire'], genreAny: ['Horror', 'Fantasy', 'Sci-Fi & Fantasy'], priority: 79 },
  { id: 'food_story', label: 'Food & Cooking', all: ['food'], priority: 78 },
  { id: 'magic_school', label: 'Magic School', all: ['magic', 'school'], priority: 77 },
  { id: 'fantasy_realm', label: 'Fantasy Realm', all: ['fantasyRealm'], priority: 76 },
  { id: 'gaming_rivalry', label: 'Gaming Rivalry', all: ['gaming', 'rivalry'], priority: 75 },
  { id: 'epic_warfare', label: 'Epic Warfare', all: ['warfare'], priority: 74 },
  { id: 'dark_fantasy', label: 'Dark Fantasy', all: ['darkFantasy'], priority: 80 },
  { id: 'satire', label: 'Satire', all: ['satire'], priority: 70 },
]

const GENRE_FALLBACKS: GenreDescriptorRule[] = [
  { id: 'space_western', label: 'Space Western', all: ['scifi', 'western'] },
  { id: 'horror_comedy', label: 'Horror Comedy', all: ['horror', 'comedy'] },
  { id: 'mystery_comedy', label: 'Mystery Comedy', all: ['mystery', 'comedy'] },
  { id: 'scifi_comedy', label: 'Sci-Fi Comedy', all: ['scifi', 'comedy'] },
  { id: 'fantasy_comedy', label: 'Fantasy Comedy', all: ['fantasy', 'comedy'] },
  { id: 'speculative_comedy', label: 'Fantasy/Sci-Fi Comedy', all: ['speculative', 'comedy'] },
  { id: 'crime_comedy', label: 'Crime Comedy', all: ['crime', 'comedy'] },
  { id: 'action_comedy', label: 'Action Comedy', all: ['action', 'comedy'] },
  { id: 'family_mystery', label: 'Family Mystery', all: ['family', 'mystery'] },
  { id: 'mystery_adventure', label: 'Mystery Adventure', all: ['mystery', 'adventure'] },
  { id: 'scifi_action', label: 'Sci-Fi Action', all: ['scifi', 'action'] },
  { id: 'fantasy_action', label: 'Fantasy Action', all: ['fantasy', 'action'] },
  { id: 'speculative_action', label: 'Fantasy/Sci-Fi Action', all: ['speculative', 'action'] },
  { id: 'scifi_adventure', label: 'Sci-Fi Adventure', all: ['scifi', 'adventure'] },
  { id: 'fantasy_adventure', label: 'Fantasy Adventure', all: ['fantasy', 'adventure'] },
  { id: 'speculative_adventure', label: 'Fantasy/Sci-Fi Adventure', all: ['speculative', 'adventure'] },
  { id: 'romantic_comedy', label: 'Rom-Com', all: ['romance', 'comedy'] },
  { id: 'family_adventure', label: 'Family Adventure', all: ['family', 'adventure'] },
  { id: 'family_comedy', label: 'Family Comedy', all: ['family', 'comedy'] },
  { id: 'dramedy', label: 'Dramedy', all: ['drama', 'comedy'] },
]

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function containsPhrase(value: string, phrase: string): boolean {
  return ` ${value} `.includes(` ${normalize(phrase)} `)
}

function hasGenre(genreNames: string[] | undefined, concept: GenreConcept): boolean {
  const genres = (genreNames ?? []).map(normalize)
  return genres.some((genre) => GENRE_ALIASES[concept].some((alias) => genre === normalize(alias)))
}

function collectConcepts(input: CardDescriptorInput): Map<ConceptId, ConceptHit[]> {
  const overview = normalize(input.overview ?? '')
  const keywords = (input.keywords ?? []).map(normalize).filter(Boolean)
  const genres = (input.genreNames ?? []).map(normalize).filter(Boolean)
  const concepts = new Map<ConceptId, ConceptHit[]>()

  for (const [conceptId, aliases] of Object.entries(CONCEPT_ALIASES) as Array<[ConceptId, readonly string[]]>) {
    const hits: ConceptHit[] = []
    for (const alias of aliases) {
      for (const keyword of keywords) {
        if (containsPhrase(keyword, alias)) {
          hits.push({ source: 'keyword', value: keyword, strength: 1 })
        }
      }
      if (overview && containsPhrase(overview, alias)) {
        hits.push({ source: 'overview', value: normalize(alias), strength: 0.76 })
      }
      for (const genre of genres) {
        if (containsPhrase(genre, alias)) {
          hits.push({ source: 'genre', value: genre, strength: 0.62 })
        }
      }
    }
    if (hits.length) concepts.set(conceptId, hits)
  }

  return concepts
}

function ruleCandidate(
  rule: DescriptorRule,
  concepts: Map<ConceptId, ConceptHit[]>,
  input: CardDescriptorInput,
): CardDescriptor | null {
  if (rule.traditionAny && (!input.tradition || !rule.traditionAny.includes(input.tradition))) return null

  if (rule.genreAny && !rule.genreAny.some((genre) => {
    const normalizedGenre = normalize(genre)
    return (input.genreNames ?? []).some((candidate) => {
      const normalizedCandidate = normalize(candidate)
      return normalizedCandidate === normalizedGenre || normalizedCandidate.includes(normalizedGenre)
    })
  })) return null

  const required = rule.all ?? []
  if (required.some((concept) => !concepts.has(concept))) return null

  const matchingAny = (rule.any ?? []).filter((concept) => concepts.has(concept))
  if (matchingAny.length < (rule.minAny ?? (rule.any?.length ? 1 : 0))) return null

  const matchedConcepts = [...required, ...matchingAny]
  const strongestHits = matchedConcepts
    .map((concept) => concepts.get(concept)?.slice().sort((a, b) => b.strength - a.strength)[0])
    .filter((hit): hit is ConceptHit => Boolean(hit))
  if (!strongestHits.length) return null

  const confidence = strongestHits.reduce((sum, hit) => sum + hit.strength, 0) / strongestHits.length
  return {
    id: rule.id,
    label: rule.label,
    confidence: Number(confidence.toFixed(2)),
    evidence: Array.from(new Set(strongestHits.map((hit) => `${hit.source}:${hit.value}`))),
  }
}

export function getCardDescriptorCandidates(input: CardDescriptorInput): CardDescriptor[] {
  const concepts = collectConcepts(input)
  const specific = RULES
    .map((rule) => ({ rule, candidate: ruleCandidate(rule, concepts, input) }))
    .filter((result): result is { rule: DescriptorRule; candidate: CardDescriptor } => Boolean(result.candidate))
    .sort((a, b) => b.rule.priority - a.rule.priority || b.candidate.confidence - a.candidate.confidence)
    .map(({ candidate }) => candidate)

  const genreFallbacks = GENRE_FALLBACKS
    .filter((rule) => rule.all.every((genre) => hasGenre(input.genreNames, genre)))
    .map<CardDescriptor>((rule) => ({
      id: rule.id,
      label: rule.label,
      confidence: 0.68,
      evidence: rule.all.map((genre) => `genre:${genre}`),
    }))

  return [...specific, ...genreFallbacks]
}

export function selectCardDescriptor(
  input: CardDescriptorInput,
  context: CardDescriptorContext = {},
): CardDescriptor | undefined {
  const excluded = new Set(context.excludeIds ?? [])
  return getCardDescriptorCandidates(input).find((candidate) => !excluded.has(candidate.id))
}
