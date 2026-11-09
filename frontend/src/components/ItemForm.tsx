import { useEffect } from 'react'
import { Apple, Droplet, Package } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import Decimal from 'decimal.js'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { Category, InventoryItem } from '@/db'
import { effectiveDaily } from '@/domain/consumption'
import type { ItemKind, Unit } from '@/domain/types'
import { messages } from '@/i18n/pt-BR'
import { formatPlural, formatQuantity } from '@/services/format'
import {
  createInventoryItem,
  updateInventoryItem,
} from '@/services/repositories'

const schema = z.object({
  name: z.string().trim().min(1, messages.formNameRequired),
  description: z.string(),
  category_id: z.string().min(1, messages.formCategoryRequired),
  item_kind: z.enum(['FOOD', 'WATER', 'OTHER']),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'unidade', 'pacote', 'lata', 'garrafa']),
  daily_consumption: z.string().refine((value) => {
    if (!value.trim()) return true
    const normalized = value.replace(',', '.')
    return /^\d+(?:\.\d{1,3})?$/.test(normalized)
  }, messages.formQuantityInvalid),
  consumption_basis: z.enum(['HOUSEHOLD', 'PER_PERSON', 'PER_ANIMAL']),
})
type FormValues = z.infer<typeof schema>

interface ItemFormProps {
  categories: Category[]
  item?: InventoryItem
  initialCategoryId?: string
  personCount?: number
  animalCount?: number
  onSaved: (itemId?: string) => void
  onCancel: () => void
}

const unitsByKind: Record<ItemKind, readonly Unit[]> = {
  FOOD: ['kg', 'g', 'pacote', 'lata'],
  WATER: ['L', 'ml', 'garrafa'],
  OTHER: ['kg', 'g', 'L', 'ml', 'unidade', 'pacote', 'lata', 'garrafa'],
}

export function ItemForm({
  categories,
  item,
  initialCategoryId,
  personCount = 0,
  animalCount = 0,
  onSaved,
  onCancel,
}: ItemFormProps) {
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
      name: item?.name ?? '',
      description: item?.description ?? '',
      category_id: item?.category_id ?? initialCategoryId ?? '',
      item_kind: item?.item_kind ?? 'FOOD',
      unit: item?.unit ?? 'kg',
      daily_consumption: item?.daily_consumption ?? '',
      consumption_basis: item?.consumption_basis ?? 'HOUSEHOLD',
    },
  })

  const itemKind = useWatch({ control, name: 'item_kind' })
  const unit = useWatch({ control, name: 'unit' })
  const dailyConsumption = useWatch({ control, name: 'daily_consumption' })
  const consumptionBasis = useWatch({ control, name: 'consumption_basis' })
  const allowedUnits = unitsByKind[itemKind]

  useEffect(() => {
    if (!allowedUnits.includes(unit)) {
      setValue('unit', allowedUnits[0] ?? 'unidade', { shouldValidate: true })
    }
  }, [allowedUnits, setValue, unit])

  const preview = (() => {
    if (!dailyConsumption.trim()) return null
    const normalized = dailyConsumption.replace(',', '.')
    if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return null
    const daily = effectiveDaily({
      id: item?.id ?? 'preview',
      name: item?.name ?? '',
      itemKind,
      unit,
      dailyConsumption: new Decimal(normalized),
      consumptionBasis,
      personCount,
      animalCount,
      batches: [],
    })
    return daily.greaterThan(0) ? formatQuantity(daily, unit) : null
  })()

  const basisLabel = {
    HOUSEHOLD: messages.household,
    PER_PERSON: messages.eachPerson,
    PER_ANIMAL: messages.eachAnimal,
  }[consumptionBasis]
  const previewLabel =
    consumptionBasis === 'HOUSEHOLD'
      ? messages.consumptionHouseholdPreview.replace(
          '{quantity}',
          preview ?? '',
        )
      : messages.consumptionPreview
          .replace(
            '{count}',
            String(
              consumptionBasis === 'PER_PERSON' ? personCount : animalCount,
            ),
          )
          .replace(
            '{members}',
            consumptionBasis === 'PER_PERSON'
              ? formatPlural(
                  personCount,
                  messages.housePerson,
                  messages.housePeople,
                ).replace(/^\d+ /, '')
              : formatPlural(
                  animalCount,
                  messages.houseAnimal,
                  messages.houseAnimals,
                ).replace(/^\d+ /, ''),
          )
          .replace('{quantity}', preview ?? '')

  const submit = handleSubmit(async (values) => {
    try {
      const consumption = values.daily_consumption.trim()
        ? values.daily_consumption.replace(',', '.')
        : null
      const payload = {
        name: values.name,
        description: values.description.trim() || null,
        category_id: values.category_id,
        item_kind: values.item_kind,
        unit: values.unit,
        daily_consumption: consumption,
        consumption_basis: values.consumption_basis,
      }
      if (item) {
        await updateInventoryItem(item.id, payload)
        onSaved(item.id)
      } else {
        const created = await createInventoryItem(payload)
        onSaved(created.id)
      }
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : messages.unknownError,
      })
    }
  })

  const kindOptions = [
    { value: 'FOOD', label: messages.itemKindFoodCard, Icon: Apple },
    { value: 'WATER', label: messages.itemKindWaterCard, Icon: Droplet },
    { value: 'OTHER', label: messages.itemKindOtherCard, Icon: Package },
  ] as const

  return (
    <form
      className="form-grid"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <label>
        {messages.itemName}
        <input {...register('name')} autoComplete="off" />
        {errors.name && (
          <span className="field-error">{errors.name.message}</span>
        )}
      </label>
      <fieldset className="item-kind-cards">
        <legend>{messages.itemKindAccessible}</legend>
        {kindOptions.map(({ value, label, Icon }) => (
          <label className="item-kind-card" key={value}>
            <input type="radio" value={value} {...register('item_kind')} />
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <label>
        {messages.description}
        <textarea {...register('description')} rows={2} />
      </label>
      <label>
        {messages.category}
        <select {...register('category_id')}>
          <option value="">{messages.formCategoryRequired}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category_id && (
          <span className="field-error">{errors.category_id.message}</span>
        )}
      </label>
      <div className="form-row">
        <label>
          {messages.unit}
          <select {...register('unit')}>
            {allowedUnits.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          {messages.consumptionBasis}
          <select {...register('consumption_basis')}>
            <option value="HOUSEHOLD">{messages.household}</option>
            <option value="PER_PERSON">{messages.eachPerson}</option>
            <option value="PER_ANIMAL">{messages.eachAnimal}</option>
          </select>
        </label>
      </div>
      <label>
        {messages.householdDailyConsumption}
        <span className="consumption-sentence">
          {consumptionBasis === 'HOUSEHOLD'
            ? messages.consumptionHouseholdSentence
            : messages.consumptionSentence.replace('{basis}', basisLabel)}
        </span>
        <span className="input-with-suffix">
          <input
            {...register('daily_consumption')}
            inputMode="decimal"
            type="text"
            placeholder={messages.optional}
          />
          <span>{unit}</span>
        </span>
        {errors.daily_consumption && (
          <span className="field-error">
            {errors.daily_consumption.message}
          </span>
        )}
      </label>
      {dailyConsumption.trim() && (
        <div className="form-preview" aria-live="polite">
          {preview ? (
            <p>{previewLabel}</p>
          ) : (
            <p>{messages.consumptionNoMembers}</p>
          )}
        </div>
      )}
      {errors.root && (
        <p className="notice notice-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="form-actions">
        <button className="button" type="submit" disabled={isSubmitting}>
          {item ? messages.saveChanges : messages.save}
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
