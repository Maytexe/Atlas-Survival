import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { HouseholdMember } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { createMember, updateMember } from '@/services/repositories'

const schema = z.object({
  name: z.string().trim().min(1, messages.formNameRequired),
  member_type: z.enum(['PERSON', 'ANIMAL']),
  age: z
    .string()
    .refine(
      (value) =>
        value === '' ||
        (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))),
      messages.formAgeInvalid,
    ),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

interface MemberFormProps {
  member?: HouseholdMember | undefined
  onSaved: () => void
  onCancel: () => void
}

export function MemberForm({ member, onSaved, onCancel }: MemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member?.name ?? '',
      member_type: member?.member_type ?? 'PERSON',
      age:
        member?.age === null || member?.age === undefined
          ? ''
          : String(member.age),
      notes: member?.notes ?? '',
    },
  })

  const submit = handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name,
        member_type: values.member_type,
        age: values.age === '' ? null : Number(values.age),
        notes: values.notes.trim() || null,
      }
      if (member) await updateMember(member.id, payload)
      else await createMember(payload)
      onSaved()
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : messages.unknownError,
      })
    }
  })

  return (
    <form
      className="form-grid"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <label>
        {messages.memberName}
        <input {...register('name')} autoComplete="name" />
        {errors.name && (
          <span className="field-error">{errors.name.message}</span>
        )}
      </label>
      <label>
        {messages.memberType}
        <select {...register('member_type')}>
          <option value="PERSON">{messages.person}</option>
          <option value="ANIMAL">{messages.animal}</option>
        </select>
      </label>
      <label>
        {messages.age}
        <input {...register('age')} inputMode="numeric" type="text" />
        {errors.age && (
          <span className="field-error">{errors.age.message}</span>
        )}
      </label>
      <label>
        {messages.notes}
        <textarea {...register('notes')} rows={2} />
      </label>
      {errors.root && (
        <p className="notice notice-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="form-actions">
        <button className="button" type="submit" disabled={isSubmitting}>
          {member ? messages.saveChanges : messages.save}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
        >
          {messages.cancel}
        </button>
      </div>
    </form>
  )
}
