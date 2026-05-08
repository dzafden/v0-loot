import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import type { Show } from '../../types'
import { CharacterRolePicker } from './CharacterRolePicker'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles } from '../../data/queries'

interface Props {
  show: Show | null
  initialPersonId?: number | null
  onClose: () => void
}

export function AssignRoleSheet({ show, initialPersonId, onClose }: Props) {
  const roles = useDexieQuery(['castRoles'], listCastRoles, [], [])
  const existingPersonIds = useMemo(
    () => new Set(roles.map((r) => r.personId).filter((id): id is number => id != null)),
    [roles],
  )

  return (
    <AnimatePresence>
      {show && (
        <CharacterRolePicker
          show={show}
          existingPersonIds={existingPersonIds}
          initialPersonId={initialPersonId}
          onClose={onClose}
          // No onBack — show is already known from ShowDetail context
        />
      )}
    </AnimatePresence>
  )
}
