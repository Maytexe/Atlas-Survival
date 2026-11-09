import { useState } from 'react'
import { MemberForm } from '@/components/MemberForm'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { useLocalData } from '@/hooks/use-local-data'
import { messages } from '@/i18n/pt-BR'
import { deleteMember } from '@/services/repositories'
import type { HouseholdMember } from '@/db'

export function PeoplePage() {
  const { data, error, loading } = useLocalData()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HouseholdMember>()
  const [actionError, setActionError] = useState('')

  const remove = async (memberId: string) => {
    if (!window.confirm(messages.confirmDelete)) return
    try {
      await deleteMember(memberId)
      setActionError('')
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : messages.unknownError,
      )
    }
  }

  return (
    <>
      <PageHeading
        title={messages.people}
        action={
          <button
            className="button"
            type="button"
            onClick={() => {
              setEditing(undefined)
              setFormOpen((open) => !open)
            }}
          >
            {messages.addMember}
          </button>
        }
      />
      {formOpen && (
        <section className="panel form-panel">
          <MemberForm
            {...(editing ? { member: editing } : {})}
            onSaved={() => {
              setFormOpen(false)
              setEditing(undefined)
            }}
            onCancel={() => {
              setFormOpen(false)
              setEditing(undefined)
            }}
          />
        </section>
      )}
      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}
      <StatusPanel
        loading={loading}
        error={error}
        empty={!loading && !error && data?.members.length === 0}
        emptyMessage={messages.noMembers}
      >
        <section className="panel record-list">
          {data?.members.map((member) => (
            <article className="record-row" key={member.id}>
              <div>
                <strong>{member.name}</strong>
                <p className="muted">
                  {member.member_type === 'PERSON'
                    ? messages.person
                    : messages.animal}
                  {member.age !== null ? ` · ${member.age}` : ''}
                </p>
                {member.notes && <p>{member.notes}</p>}
              </div>
              <div className="row-actions">
                <button
                  className="button button-secondary button-small"
                  type="button"
                  onClick={() => {
                    setEditing(member)
                    setFormOpen(true)
                  }}
                >
                  {messages.edit}
                </button>
                <button
                  className="button button-danger button-small"
                  type="button"
                  onClick={() => void remove(member.id)}
                >
                  {messages.delete}
                </button>
              </div>
            </article>
          ))}
        </section>
      </StatusPanel>
    </>
  )
}
