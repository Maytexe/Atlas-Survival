import type { components } from '@/types/api.generated'
import { db, type HouseholdMember } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { persistNextClientTimestamp } from '@/services/clock'
import { RepositoryError } from './errors'
import { addMutation, asPayload, createId, recordTimestamps } from './outbox'

type MemberCreate = components['schemas']['MemberCreate']
type MemberUpdate = components['schemas']['MemberUpdate']

export async function createMember(
  input: MemberCreate,
  database = db,
): Promise<HouseholdMember> {
  const id = input.id ?? createId()
  return database.transaction(
    'rw',
    database.household_members,
    database.meta,
    database.outbox,
    async () => {
      const clientTs = await persistNextClientTimestamp(database.meta)
      const member: HouseholdMember = {
        ...recordTimestamps(clientTs),
        id,
        name: input.name,
        member_type: input.member_type,
        age: input.age ?? null,
        notes: input.notes ?? null,
      }
      await database.household_members.add(member)
      await addMutation(
        database,
        'household_members',
        'CREATE',
        id,
        asPayload(input),
        clientTs,
      )
      return member
    },
  )
}

export async function updateMember(
  id: string,
  patch: MemberUpdate,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.household_members,
    database.meta,
    database.outbox,
    async () => {
      const member = await database.household_members.get(id)
      if (!member || member.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const clientTs = await persistNextClientTimestamp(database.meta)
      const update: Partial<HouseholdMember> = {
        updated_at: clientTs,
        client_updated_at: clientTs,
      }
      if (typeof patch.name === 'string') update.name = patch.name
      if (patch.member_type) update.member_type = patch.member_type
      if (patch.age !== undefined) update.age = patch.age
      if (patch.notes !== undefined) update.notes = patch.notes
      await database.household_members.update(id, update)
      await addMutation(
        database,
        'household_members',
        'UPDATE',
        id,
        asPayload(patch),
        clientTs,
      )
    },
  )
}

export async function deleteMember(id: string, database = db): Promise<void> {
  await database.transaction(
    'rw',
    database.household_members,
    database.meta,
    database.outbox,
    async () => {
      const member = await database.household_members.get(id)
      if (!member || member.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const clientTs = await persistNextClientTimestamp(database.meta)
      await database.household_members.update(id, {
        deleted_at: clientTs,
        updated_at: clientTs,
        client_updated_at: clientTs,
      })
      await addMutation(
        database,
        'household_members',
        'DELETE',
        id,
        {},
        clientTs,
      )
    },
  )
}

export async function listMembers(database = db): Promise<HouseholdMember[]> {
  return database.household_members
    .filter((member) => member.deleted_at === null)
    .toArray()
}
