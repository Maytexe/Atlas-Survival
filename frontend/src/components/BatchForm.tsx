import { zodResolver } from '@hookform/resolvers/zod'
import Decimal from 'decimal.js'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { StockBatch } from '@/db'
import { calculateDashboard } from '@/domain'
import type { ItemSnapshot } from '@/domain/types'
import { unitDefinitions } from '@/domain/units'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import { addCalendarMonths, formatQuantity } from '@/services/format'
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
  itemUnit?: string
  batch?: StockBatch | undefined
  storageLocations?: readonly string[]
  snapshots?: readonly ItemSnapshot[]
  goalFoodDays?: number | null
  goalWaterDays?: number | null
  today?: string
  onSaved: () => void
  onCancel: () => void
}

export function BatchForm({
  inventoryItemId,
  itemUnit = messages.countUnit,
  batch,
  storageLocations = [],
  snapshots,
  goalFoodDays = null,
  goalWaterDays = null,
  today = getToday(),
  onSaved,
  onCancel,
}: BatchFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  const quantity = useWatch({ control, name: 'quantity' })
  const expirationDate = useWatch({ control, name: 'expiration_date' })
  const preview = (() => {
    if (!snapshots || !quantity.trim()) return null
    let parsedQuantity: Decimal
    try {
      parsedQuantity = new Decimal(quantity.replace(',', '.'))
      if (!parsedQuantity.isFinite() || parsedQuantity.isNegative()) return null
    } catch {
      return null
    }
    const item = snapshots.find((snapshot) => snapshot.id === inventoryItemId)
    if (!item || (item.itemKind !== 'FOOD' && item.itemKind !== 'WATER'))
      return null
    const unit = unitDefinitions[item.unit]
    const baseUnit = unit.base_unit
    const current = calculateDashboard(
      snapshots,
      today,
      goalFoodDays,
      goalWaterDays,
    )
    const beforeAutonomy = current.autonomy.find(
      (value) =>
        value.item_kind === item.itemKind &&
        value.dimension === unit.dimension &&
        (value.base_unit ?? unit.base_unit) === baseUnit,
    )
    const beforeGoal = current.goals.find(
      (value) =>
        value.item_kind === item.itemKind &&
        value.dimension === unit.dimension &&
        value.base_unit === baseUnit,
    )
    const hypothetical: ItemSnapshot = {
      ...item,
      batches: [
        ...item.batches.filter((currentBatch) => currentBatch.id !== batch?.id),
        {
          id: 'preview-stock',
          quantity: parsedQuantity,
          expirationDate: expirationDate || null,
        },
      ],
    }
    const next = calculateDashboard(
      snapshots.map((snapshot) =>
        snapshot.id === inventoryItemId ? hypothetical : snapshot,
      ),
      today,
      goalFoodDays,
      goalWaterDays,
    )
    const afterAutonomy = next.autonomy.find(
      (value) =>
        value.item_kind === item.itemKind &&
        value.dimension === unit.dimension &&
        (value.base_unit ?? unit.base_unit) === baseUnit,
    )
    const afterGoal = next.goals.find(
      (value) =>
        value.item_kind === item.itemKind &&
        value.dimension === unit.dimension &&
        value.base_unit === baseUnit,
    )
    if (
      !beforeGoal ||
      beforeGoal.goal_days === null ||
      !beforeGoal.daily_base.greaterThan(0)
    ) {
      return { text: messages.previewStockNoGoal }
    }
    const values = {
      before: String(beforeAutonomy?.days ?? messages.emptyData),
      after: String(afterAutonomy?.days ?? messages.emptyData),
      goal: String(beforeGoal.goal_days),
    }
    if (afterGoal?.status === 'MET') {
      return {
        text: messages.previewStockMet
          .replace('{before}', values.before)
          .replace('{after}', values.after)
          .replace('{goal}', values.goal),
      }
    }
    return {
      text: messages.previewStockBelow
        .replace('{before}', values.before)
        .replace('{after}', values.after)
        .replace(
          '{missing}',
          formatQuantity(afterGoal?.missing_base ?? new Decimal(0), baseUnit),
        ),
    }
  })()

  const setExpiryMonths = (months: number | null) => {
    setValue(
      'expiration_date',
      months === null ? '' : addCalendarMonths(today, months),
      { shouldDirty: true },
    )
  }

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
        <span className="input-with-suffix">
          <input
            {...register('quantity')}
            aria-label={messages.quantity}
            inputMode="decimal"
            type="text"
          />
          <span>{itemUnit}</span>
        </span>
        {errors.quantity && (
          <span className="field-error" role="alert">
            {errors.quantity.message}
          </span>
        )}
      </label>
      <fieldset className="batch-shortcut-group">
        <legend>{messages.expirationDate}</legend>
        <div className="batch-shortcuts">
          {[
            [null, messages.expiryNone],
            [3, messages.expiryPlus3Months],
            [6, messages.expiryPlus6Months],
            [12, messages.expiryPlus1Year],
            [24, messages.expiryPlus2Years],
          ].map(([months, label]) => (
            <button
              className="button button-secondary button-small"
              type="button"
              key={String(months)}
              onClick={() =>
                setExpiryMonths(typeof months === 'number' ? months : null)
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        {messages.expirationDate}
        <input {...register('expiration_date')} type="date" />
      </label>
      <label>
        {messages.storageLocation}
        <input
          {...register('storage_location')}
          list="storage-location-suggestions"
          autoComplete="off"
        />
        <datalist id="storage-location-suggestions">
          {storageLocations.map((location) => (
            <option value={location} key={location} />
          ))}
        </datalist>
      </label>
      <details>
        <summary>{messages.moreDetails}</summary>
        <label>
          {messages.batchCodeLabel}
          <input {...register('batch_number')} autoComplete="off" />
        </label>
      </details>
      {preview && (
        <div className="form-preview" aria-live="polite">
          <p>{preview.text}</p>
        </div>
      )}
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
