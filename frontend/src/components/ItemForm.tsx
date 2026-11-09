import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Category, InventoryItem } from '@/db'
import { messages } from '@/i18n/pt-BR'
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
  onSaved: () => void
  onCancel: () => void
}

export function ItemForm({
  categories,
  item,
  initialCategoryId,
  onSaved,
  onCancel,
}: ItemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      category_id: item?.category_id ?? initialCategoryId ?? '',
      item_kind: item?.item_kind ?? 'FOOD',
      unit: item?.unit ?? 'unidade',
      daily_consumption: item?.daily_consumption ?? '',
      consumption_basis: item?.consumption_basis ?? 'HOUSEHOLD',
    },
  })

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
      if (item) await updateInventoryItem(item.id, payload)
      else await createInventoryItem(payload)
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
        {messages.itemName}
        <input {...register('name')} autoComplete="off" />
        {errors.name && (
          <span className="field-error">{errors.name.message}</span>
        )}
      </label>
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
          {messages.itemKind}
          <select {...register('item_kind')}>
            <option value="FOOD">{messages.foodAvailability}</option>
            <option value="WATER">{messages.waterAvailability}</option>
            <option value="OTHER">{messages.inventory}</option>
          </select>
        </label>
        <label>
          {messages.unit}
          <select {...register('unit')}>
            {['kg', 'g', 'L', 'ml', 'unidade', 'pacote', 'lata', 'garrafa'].map(
              (unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          {messages.dailyConsumption}
          <input
            {...register('daily_consumption')}
            inputMode="decimal"
            type="text"
            placeholder={messages.optional}
          />
          {errors.daily_consumption && (
            <span className="field-error">
              {errors.daily_consumption.message}
            </span>
          )}
        </label>
        <label>
          {messages.consumptionBasis}
          <select {...register('consumption_basis')}>
            <option value="HOUSEHOLD">{messages.dashboardPeople}</option>
            <option value="PER_PERSON">{messages.person}</option>
            <option value="PER_ANIMAL">{messages.animal}</option>
          </select>
        </label>
      </div>
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
