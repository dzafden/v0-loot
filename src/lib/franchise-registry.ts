import registryData from '../data/generated/franchise-registry.json'
import type { FranchiseDefinition, FranchiseMember, MediaType, Show } from '../types'

export type FranchiseRegistryKind = 'collection' | 'sequence' | 'spin-off' | 'franchise' | 'universe'
type FranchiseRegistryGroupKind = Extract<FranchiseRegistryKind, 'collection' | 'franchise' | 'universe'>
type FranchiseRegistryRelationshipKind = Extract<FranchiseRegistryKind, 'sequence' | 'spin-off'>

export type FranchiseRegistrySource = 'wikidata' | 'anilist'

export interface FranchiseRegistryMember {
  key: string
  id: number
  mediaType: MediaType
  name: string
  /**
   * Provenance ids are source-dependent and therefore optional: Wikidata-sourced entries carry
   * `wikidataId`, AniList-sourced entries carry `anilistId`. Declaring either as required was a
   * lie the `as FranchiseRegistry` cast hid — the JSON is never structurally validated, so a
   * consumer would have read `undefined` while TypeScript promised a string.
   */
  wikidataId?: string
  anilistId?: number
  releaseDate?: string
}

export interface FranchiseRegistryGroup {
  id: string
  wikidataId?: string
  anilistId?: number
  name: string
  kind: FranchiseRegistryGroupKind
  source: FranchiseRegistrySource
  achievementEligible: boolean
  members: FranchiseRegistryMember[]
}

export interface FranchiseRegistryCandidate extends FranchiseRegistryMember {
  groupId: string
  groupName: string
  kind: FranchiseRegistryKind
}

interface FranchiseRegistry {
  version: number
  generatedAt: string
  license: string
  sourceUrl: string
  groups: FranchiseRegistryGroup[]
  relationships: Array<{
    id: string
    kind: FranchiseRegistryRelationshipKind
    source: FranchiseRegistrySource
    from: FranchiseRegistryMember
    to: FranchiseRegistryMember
  }>
}

const registry = registryData as FranchiseRegistry
const groupsByMember = new Map<string, FranchiseRegistryGroup[]>()
const relationshipsByMember = new Map<string, FranchiseRegistryCandidate[]>()

for (const group of registry.groups) {
  for (const member of group.members) {
    const groups = groupsByMember.get(member.key) ?? []
    groups.push(group)
    groupsByMember.set(member.key, groups)
  }
}

for (const relationship of registry.relationships) {
  const fromCandidates = relationshipsByMember.get(relationship.from.key) ?? []
  fromCandidates.push({
    ...relationship.to,
    groupId: relationship.id,
    groupName: relationship.kind === 'spin-off' ? 'Spin-off' : 'Story sequence',
    kind: relationship.kind,
  })
  relationshipsByMember.set(relationship.from.key, fromCandidates)

  const toCandidates = relationshipsByMember.get(relationship.to.key) ?? []
  toCandidates.push({
    ...relationship.from,
    groupId: relationship.id,
    groupName: relationship.kind === 'spin-off' ? 'Spin-off' : 'Story sequence',
    kind: relationship.kind,
  })
  relationshipsByMember.set(relationship.to.key, toCandidates)
}

const KIND_PRIORITY: Record<FranchiseRegistryKind, number> = {
  collection: 0,
  sequence: 1,
  'spin-off': 2,
  franchise: 3,
  universe: 4,
}

export function franchiseRegistryKey(mediaType: MediaType, id: number) {
  return `${mediaType}:${id}`
}

const REGISTRY_DEFINITION_ID_BASE = 1_000_000_000

/**
 * Dexie's definition table currently uses numeric keys. Registry ids are strings, so reserve
 * a large negative range that cannot collide with positive TMDB collection ids or the small
 * negative TMDB company ids used by studio collections.
 */
export function registryDefinitionId(groupId: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < groupId.length; index += 1) {
    hash ^= groupId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return -(REGISTRY_DEFINITION_ID_BASE + (hash >>> 0))
}

export function normaliseFranchiseIdentity(name: string) {
  let value = name.toLowerCase().trim()
  const suffix = /\s+(universe|franchise|collection|films?|film series|in film|movie series)$/
  while (suffix.test(value)) value = value.replace(suffix, '')
  return value.replace(/[^a-z0-9]+/g, ' ').trim()
}

function definitionMemberKey(member: Pick<FranchiseMember, 'id' | 'mediaType'>) {
  return franchiseRegistryKey(member.mediaType ?? 'movie', member.id)
}

function mergeMembers(preferred: FranchiseMember[], alternate: FranchiseMember[]) {
  const alternateByKey = new Map(alternate.map((member) => [definitionMemberKey(member), member]))
  return preferred.map((member) => {
    const other = alternateByKey.get(definitionMemberKey(member))
    return {
      ...member,
      posterPath: member.posterPath ?? other?.posterPath ?? null,
      backdropPath: member.backdropPath ?? other?.backdropPath ?? null,
      overview: member.overview ?? other?.overview,
      releaseDate: member.releaseDate || other?.releaseDate || '',
      mediaType: member.mediaType ?? other?.mediaType ?? 'movie',
    }
  })
}

function mergeDefinitionMembership(
  identity: FranchiseDefinition,
  alternate: FranchiseDefinition,
): FranchiseDefinition {
  const identityWins = identity.memberIds.length >= alternate.memberIds.length
  const members = identityWins
    ? mergeMembers(identity.members, alternate.members)
    : mergeMembers(alternate.members, identity.members)
  return {
    ...identity,
    posterPath: identity.posterPath ?? alternate.posterPath ?? null,
    backdropPath: identity.backdropPath ?? alternate.backdropPath ?? null,
    memberIds: members.map((member) => member.id),
    members,
    scope: identity.scope === 'universe' || alternate.scope === 'universe' ? 'universe' : identity.scope ?? alternate.scope,
    tradition: identity.tradition ?? alternate.tradition,
    updatedAt: Math.max(identity.updatedAt, alternate.updatedAt),
  }
}

function registryDefinition(
  group: FranchiseRegistryGroup,
  showsByKey: Map<string, Show>,
  at: number,
): FranchiseDefinition | null {
  const today = new Date(at).toISOString().slice(0, 10)
  const members = group.members
    .filter((member) => Boolean(member.releaseDate) && member.releaseDate! <= today)
    .map((member) => {
      const known = showsByKey.get(member.key)
      return {
        id: member.id,
        name: member.name,
        posterPath: known?.posterPath ?? null,
        backdropPath: known?.backdropPath ?? null,
        releaseDate: member.releaseDate ?? '',
        mediaType: member.mediaType,
      }
    })
    .sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999') || a.name.localeCompare(b.name))
  if (members.length < 3) return null

  const knownMembers = members
    .map((member) => showsByKey.get(definitionMemberKey(member)))
    .filter((show): show is Show => Boolean(show))
  const traditions = new Set(knownMembers.map((show) => show.tradition).filter(Boolean))
  return {
    id: registryDefinitionId(group.id),
    name: group.name,
    posterPath: knownMembers.map((show) => show.posterPath).find(Boolean) ?? null,
    backdropPath: knownMembers.map((show) => show.backdropPath).find(Boolean) ?? null,
    memberIds: members.map((member) => member.id),
    members,
    source: group.source,
    sourceKey: group.id,
    scope: group.kind === 'collection' ? 'series' : 'universe',
    tradition: traditions.size === 1 ? knownMembers.find((show) => show.tradition)?.tradition : undefined,
    collectible: true,
    updatedAt: at,
  }
}

export interface RegistryDefinitionSync {
  definitions: FranchiseDefinition[]
  supersededIds: number[]
  replacements: Array<{ previousId: number; definition: FranchiseDefinition }>
}

/**
 * Materialise only eligible groups touched by the user's library. TMDB collection definitions
 * retain their canonical local identity and artwork when a registry group has the same name,
 * while the larger of the two member sets wins.
 */
export function buildRegistryDefinitionsForShows(
  shows: Show[],
  existingDefinitions: FranchiseDefinition[],
  at = Date.now(),
): RegistryDefinitionSync {
  const showsByKey = new Map(shows.map((show) => [franchiseRegistryKey(show.mediaType ?? 'tv', show.id), show]))
  const touchedGroups = new Map<string, FranchiseRegistryGroup>()
  for (const key of showsByKey.keys()) {
    for (const group of groupsByMember.get(key) ?? []) {
      if (group.achievementEligible) touchedGroups.set(group.id, group)
    }
  }

  const candidatesByName = new Map<string, FranchiseDefinition>()
  for (const group of touchedGroups.values()) {
    const candidate = registryDefinition(group, showsByKey, at)
    if (!candidate) continue
    const name = normaliseFranchiseIdentity(candidate.name)
    const current = candidatesByName.get(name)
    if (!current || candidate.memberIds.length > current.memberIds.length) candidatesByName.set(name, candidate)
  }

  const existingByName = new Map<string, FranchiseDefinition[]>()
  for (const definition of existingDefinitions) {
    if (definition.source === 'tmdb-studio') continue
    const name = normaliseFranchiseIdentity(definition.name)
    existingByName.set(name, [...(existingByName.get(name) ?? []), definition])
  }

  const definitions: FranchiseDefinition[] = []
  const supersededIds = new Set<number>()
  const replacements = new Map<number, FranchiseDefinition>()
  for (const [name, candidate] of candidatesByName) {
    const matches = existingByName.get(name) ?? []
    const tmdb = matches
      .filter((definition) => definition.source === 'tmdb-collection')
      .sort((a, b) => b.memberIds.length - a.memberIds.length)[0]
    if (tmdb) {
      const merged = mergeDefinitionMembership(tmdb, candidate)
      definitions.push(merged)
      for (const match of matches) {
        if (match.id === tmdb.id) continue
        supersededIds.add(match.id)
        replacements.set(match.id, merged)
      }
      continue
    }

    const sameRegistryDefinition = matches.find((definition) => definition.sourceKey === candidate.sourceKey)
    const largestExisting = [...matches].sort((a, b) => b.memberIds.length - a.memberIds.length)[0]
    const merged = sameRegistryDefinition
      ? mergeDefinitionMembership(candidate, sameRegistryDefinition)
      : largestExisting && largestExisting.memberIds.length > candidate.memberIds.length
        ? mergeDefinitionMembership(candidate, largestExisting)
        : candidate
    definitions.push(merged)
    for (const match of matches) {
      if (match.id === candidate.id) continue
      supersededIds.add(match.id)
      replacements.set(match.id, merged)
    }
  }

  return {
    definitions,
    supersededIds: [...supersededIds],
    replacements: [...replacements].map(([previousId, definition]) => ({ previousId, definition })),
  }
}

export function getAchievementEligibleFranchiseRegistryGroups() {
  return registry.groups.filter((group) => group.achievementEligible)
}

export function getFranchiseRegistryGroups(show: Pick<Show, 'id' | 'mediaType'>) {
  return groupsByMember.get(franchiseRegistryKey(show.mediaType ?? 'tv', show.id)) ?? []
}

export function getFranchiseRegistryCandidates(
  show: Pick<Show, 'id' | 'mediaType' | 'year'>,
  at = Date.now(),
) {
  const anchorKey = franchiseRegistryKey(show.mediaType ?? 'tv', show.id)
  const today = new Date(at).toISOString().slice(0, 10)
  const anchorYear = show.year
  const candidates = new Map<string, FranchiseRegistryCandidate>()

  for (const group of groupsByMember.get(anchorKey) ?? []) {
    for (const member of group.members) {
      if (member.key === anchorKey || (member.releaseDate && member.releaseDate > today)) continue
      const existing = candidates.get(member.key)
      if (existing && KIND_PRIORITY[existing.kind] <= KIND_PRIORITY[group.kind]) continue
      candidates.set(member.key, {
        ...member,
        groupId: group.id,
        groupName: group.name,
        kind: group.kind,
      })
    }
  }

  for (const candidate of relationshipsByMember.get(anchorKey) ?? []) {
    const existing = candidates.get(candidate.key)
    if (!existing || KIND_PRIORITY[candidate.kind] < KIND_PRIORITY[existing.kind]) {
      candidates.set(candidate.key, candidate)
    }
  }

  return [...candidates.values()].sort((a, b) => {
    if (a.kind !== b.kind) return KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]
    if (a.mediaType !== b.mediaType) return a.mediaType === show.mediaType ? -1 : 1
    if (anchorYear) {
      const aDistance = a.releaseDate ? Math.abs(Number(a.releaseDate.slice(0, 4)) - anchorYear) : Number.MAX_SAFE_INTEGER
      const bDistance = b.releaseDate ? Math.abs(Number(b.releaseDate.slice(0, 4)) - anchorYear) : Number.MAX_SAFE_INTEGER
      if (aDistance !== bDistance) return aDistance - bDistance
    }
    return (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999') || a.name.localeCompare(b.name)
  })
}

export function getFranchiseRegistryStats() {
  return {
    version: registry.version,
    generatedAt: registry.generatedAt,
    groupCount: registry.groups.length,
    eligibleGroupCount: registry.groups.filter((group) => group.achievementEligible).length,
    relationshipCount: registry.relationships.length,
  }
}
