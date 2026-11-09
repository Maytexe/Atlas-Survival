import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Category } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { createCategory, updateCategory } from '@/services/repositories'

const schema = z.object({
  name: z.string().trim().min(1, messages.formNameRequired),
  description: z.string(),
})
type FormValues = z.infer<typeof schema>

interface CategoryFormProps {
  category?: Category | undefined
  onSaved: () => void
  onCancel: () => void
}

export function CategoryForm({
  category,
  onSaved,
  onCancel,
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
    },
  })

  const submit = handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description.trim() || null,
      }
      if (category) await updateCategory(category.id, payload)
      else await createCategory(payload)
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
        {messages.categoryName}
        <input {...register('name')} autoComplete="off" />
        {errors.name && (
          <span className="field-error">{errors.name.message}</span>
        )}
      </label>
      <label>
        {messages.categoryDescription}
        <textarea {...register('description')} rows={2} />
      </label>
      {errors.root && (
        <p className="notice notice-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="form-actions">
        <button className="button" type="submit" disabled={isSubmitting}>
          {category ? messages.saveChanges : messages.save}
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
