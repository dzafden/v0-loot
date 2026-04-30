import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import type { Show } from '../../types'
import { CharacterRolePicker } from './CharacterRolePicker'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles } from '../../data/queries'

interface Props {
  show: Show | null
  onClose: () => void
}

export function AssignRoleSheet({ show, onClose }: Props) {
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
          onClose={onClose}
          // No onBack — show is already known from ShowDetail context
        />
      )}
    </AnimatePresence>
  )
}
