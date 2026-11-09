import { zodResolver } from '@hookform/resolvers/zod'
import Decimal from 'decimal.js'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { StockBatch } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { createBatch, updateBatch } from '@/services/repositories'

const schema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, messages.formQuantityRequired)
    .refine((value) => {
      try {
        const decimal = new Decimal(value.replace(',', '.'))
        return decimal.isFinite() && decimal.decimalPlaces() <= 3
      } catch {
        return false
      }
    }, messages.formQuantityInvalid)
    .refine(
      (value) => new Decimal(value.replace(',', '.')).greaterThanOrEqualTo(0),
      messages.formQuantityNegative,
    ),
  expiration_date: z.string(),
  batch_number: z.string(),
  storage_location: z.string(),
})
type FormValues = z.infer<typeof schema>

interface BatchFormProps {
  inventoryItemId: string
  batch?: StockBatch | undefined
  onSaved: () => void
  onCancel: () => void
}

export function BatchForm({
  inventoryItemId,
  batch,
  onSaved,
  onCancel,
}: BatchFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: batch?.quantity ?? '',
      expiration_date: batch?.expiration_date ?? '',
      batch_number: batch?.batch_number ?? '',
      storage_location: batch?.storage_location ?? '',
    },
  })

  const submit = handleSubmit(async (values) => {
    try {
      const quantity = new Decimal(values.quantity.replace(',', '.')).toFixed(3)
      const payload = {
        quantity,
        expiration_date: values.expiration_date || null,
        batch_number: values.batch_number.trim() || null,
        storage_location: values.storage_location.trim() || null,
      }
      if (batch) await updateBatch(batch.id, payload)
      else await createBatch(inventoryItemId, payload)
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
        {messages.quantity}
        <input {...register('quantity')} inputMode="decimal" type="text" />
        {errors.quantity && (
          <span className="field-error" role="alert">
            {errors.quantity.message}
          </span>
        )}
      </label>
      <label>
        {messages.expirationDate}
        <input {...register('expiration_date')} type="date" />
      </label>
      <label>
        {messages.batchNumber}
        <input {...register('batch_number')} autoComplete="off" />
      </label>
      <label>
        {messages.storageLocation}
        <input {...register('storage_location')} autoComplete="off" />
      </label>
      {errors.root && (
        <p className="notice notice-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="form-actions">
        <button className="button" type="submit" disabled={isSubmitting}>
          {batch ? messages.saveChanges : messages.save}
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
