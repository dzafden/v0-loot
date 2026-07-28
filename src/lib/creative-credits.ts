import type { MediaType } from '../types'
import type { TmdbCreator, TmdbCrewMember, TmdbProductionCompany } from './tmdb'

export type CreativeLead = {
  label: string
  people: { id: number; name: string; profile_path: string | null }[]
}

const KNOWN_ANIMATION_STUDIOS = new Set([
  'a1pictures',
  'aardman',
  'aardmananimations',
  'atomiccartoons',
  'bardelentertainment',
  'bentoboxentertainment',
  'bones',
  'bouldermedia',
  'cartoonnetworkstudios',
  'cartoonsaloon',
  'cloverworks',
  'davidproduction',
  'disneytelevisionanimation',
  'dreamworksanimation',
  'flyingbarkproductions',
  'gainax',
  'illumination',
  'jcstaff',
  'khara',
  'kyotoanimation',
  'laika',
  'madhouse',
  'mappa',
  'mercuryfilmworks',
  'nickelodeonanimationstudio',
  'olm',
  'orange',
  'pierrot',
  'pixar',
  'pixaranimationstudios',
  'polygonpictures',
  'powerhouseanimationstudios',
  'productionig',
  'roughdraftstudios',
  'sciencearu',
  'shadowmachine',
  'shaft',
  'sonypicturesanimation',
  'studio4c',
  'studiodeen',
  'studioghibli',
  'sunrise',
  'titmouse',
  'tmsentertainment',
  'toeianimation',
  'trigger',
  'ufotable',
  'waltdisneyanimationstudios',
  'warnerbrosanimation',
  'witstudio',
  'xebec',
])

function normalizeCompanyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function selectAnimationStudios(companies: TmdbProductionCompany[], limit = 2) {
  return companies
    .filter((company) => {
      const normalized = normalizeCompanyName(company.name)
      return KNOWN_ANIMATION_STUDIOS.has(normalized)
        || /\b(animation|animations|cartoon|anime)\b/i.test(company.name)
    })
    .slice(0, limit)
}

export function selectCreators(
  mediaType: MediaType,
  createdBy: TmdbCreator[] = [],
  crew: TmdbCrewMember[] = [],
): CreativeLead {
  if (createdBy.length) {
    return { label: createdBy.length > 1 ? 'Creators' : 'Creator', people: createdBy.slice(0, 3) }
  }

  const creatorJobs = mediaType === 'movie'
    ? new Set(['Director'])
    : new Set(['Creator', 'Original Series Creator'])
  const people = crew
    .filter((member) => creatorJobs.has(member.job))
    .filter((member, index, all) => all.findIndex((candidate) => candidate.id === member.id) === index)
    .slice(0, 2)

  return {
    label: mediaType === 'movie' ? (people.length > 1 ? 'Directors' : 'Director') : (people.length > 1 ? 'Creators' : 'Creator'),
    people,
  }
}
