import registryData from '../data/generated/franchise-registry.json'
import type { MediaType, Show } from '../types'

export type FranchiseRegistryKind = 'collection' | 'sequence' | 'spin-off' | 'franchise' | 'universe'
type FranchiseRegistryGroupKind = Extract<FranchiseRegistryKind, 'collection' | 'franchise' | 'universe'>
type FranchiseRegistryRelationshipKind = Extract<FranchiseRegistryKind, 'sequence' | 'spin-off'>

export interface FranchiseRegistryMember {
  key: string
  id: number
  mediaType: MediaType
  name: string
  wikidataId: string
  releaseDate?: string
}

export interface FranchiseRegistryGroup {
  id: string
  wikidataId: string
  name: string
  kind: FranchiseRegistryGroupKind
  source: 'wikidata'
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
    source: 'wikidata'
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
    relationshipCount: registry.relationships.length,
  }
}
