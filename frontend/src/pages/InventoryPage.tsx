import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ItemForm } from '@/components/ItemForm'
import { InventoryGoalStrip } from '@/components/InventoryGoalStrip'
import { InventoryItemList } from '@/components/InventoryItemList'
import { PageHeading } from '@/components/PageHeading'
import { SidePanel } from '@/components/SidePanel'
import { StatusPanel } from '@/components/StatusPanel'
import {
  calculateAutonomy,
  calculateExpiry,
  calculateStockAvailability,
} from '@/domain'
import { effectiveDaily } from '@/domain/consumption'
import { toItemSnapshots } from '@/domain/from-records'
import { useGoals } from '@/hooks/use-goals'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'

type InventoryFilter =
  'todos' | 'vence-logo' | 'vencidos' | 'sem-estoque' | 'sem-consumo'
type InventorySort = 'nome' | 'autonomia' | 'validade'

const filters: Array<{ value: InventoryFilter; label: string }> = [
  { value: 'todos', label: messages.filterAll },
  { value: 'vence-logo', label: messages.filterExpiring },
  { value: 'vencidos', label: messages.filterExpired },
  { value: 'sem-estoque', label: messages.filterOutOfStock },
  { value: 'sem-consumo', label: messages.noConsumptionFilter },
]

export function InventoryPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const { goalFoodDays, goalWaterDays } = useGoals()
  const [formOpen, setFormOpen] = useState(false)
  const [createdItemId, setCreatedItemId] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState<InventorySort>('nome')
  const [searchParams, setSearchParams] = useSearchParams()
  const today = getToday(new Date(), settings?.timeZone)
  const snapshots = useMemo(
    () => (data ? toItemSnapshots(data.items, data.batches, data.members) : []),
    [data],
  )
  const snapshotById = useMemo(
    () => new Map(snapshots.map((snapshot) => [snapshot.id, snapshot])),
    [snapshots],
  )
  const filterValue = searchParams.get('filtro')
  const filter = filters.some((option) => option.value === filterValue)
    ? (filterValue as InventoryFilter)
    : 'todos'
  const items = useMemo(() => {
    const query = search.toLocaleLowerCase('pt-BR')
    return (data?.items ?? [])
      .filter((item) => {
        const snapshot = snapshotById.get(item.id)
        if (
          !item.name.toLocaleLowerCase('pt-BR').includes(query) ||
          (categoryId && item.category_id !== categoryId)
        ) {
          return false
        }
        const batches = snapshot?.batches ?? []
        const available = calculateStockAvailability(batches, today).available
        if (filter === 'vence-logo') {
          return batches.some(
            (batch) =>
              batch.expirationDate !== null &&
              calculateExpiry(batch.expirationDate, today).expiring_soon &&
              !calculateExpiry(batch.expirationDate, today).expired,
          )
        }
        if (filter === 'vencidos') {
          return batches.some(
            (batch) =>
              batch.expirationDate !== null &&
              calculateExpiry(batch.expirationDate, today).expired &&
              batch.quantity.greaterThan(0),
          )
        }
        if (filter === 'sem-estoque') return available.isZero()
        if (filter === 'sem-consumo') {
          return !snapshot || !effectiveDaily(snapshot).greaterThan(0)
        }
        return true
      })
      .sort((first, second) => {
        const firstSnapshot = snapshotById.get(first.id)
        const secondSnapshot = snapshotById.get(second.id)
        if (sort === 'nome') {
          return first.name.localeCompare(second.name, 'pt-BR')
        }
        if (sort === 'autonomia') {
          const firstDays = firstSnapshot
            ? calculateAutonomy(firstSnapshot, today)
            : null
          const secondDays = secondSnapshot
            ? calculateAutonomy(secondSnapshot, today)
            : null
          return (firstDays ?? Infinity) - (secondDays ?? Infinity)
        }
        const firstDate =
          firstSnapshot?.batches.find((batch) => batch.expirationDate !== null)
            ?.expirationDate ?? '9999-12-31'
        const secondDate =
          secondSnapshot?.batches.find((batch) => batch.expirationDate !== null)
            ?.expirationDate ?? '9999-12-31'
        return firstDate.localeCompare(secondDate)
      })
  }, [categoryId, data?.items, filter, search, snapshotById, sort, today])

  const changeFilter = (value: InventoryFilter) => {
    setSearchParams(value === 'todos' ? {} : { filtro: value })
  }

  return (
    <>
      <PageHeading
        title={messages.inventoryTitle}
        action={
          <button
            className="button"
            type="button"
            onClick={() => setFormOpen(true)}
          >
            {messages.addItem}
          </button>
        }
      />
      <InventoryGoalStrip
        snapshots={snapshots}
        today={today}
        goalFoodDays={goalFoodDays}
        goalWaterDays={goalWaterDays}
      />
      {createdItemId && (
        <p className="notice notice-info" role="status">
          {messages.itemCreatedAddStock}{' '}
          <Link to={`/estoque/${createdItemId}?adicionar=estoque`}>
            {messages.addStock}
          </Link>
        </p>
      )}
      <div className="filter-row">
        <label>
          {messages.searchInventory}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {messages.filterCategory}
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">{messages.allCategories}</option>
            {data?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {messages.sortBy}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as InventorySort)}
          >
            <option value="nome">{messages.sortName}</option>
            <option value="autonomia">{messages.sortAutonomy}</option>
            <option value="validade">{messages.sortExpiration}</option>
          </select>
        </label>
      </div>
      <div className="quick-filters" aria-label={messages.inventoryTitle}>
        {filters.map((option) => (
          <button
            className="filter-chip"
            type="button"
            key={option.value}
            aria-pressed={filter === option.value}
            onClick={() => changeFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <StatusPanel
        loading={loading}
        error={error}
        empty={!loading && !error && items.length === 0}
        emptyMessage={
          data?.items.length ? messages.noItemsMatch : messages.noItems
        }
      >
        {data && (
          <InventoryItemList
            items={items}
            categories={data.categories}
            snapshots={snapshotById}
            today={today}
            timeZone={settings?.timeZone ?? 'America/Sao_Paulo'}
          />
        )}
      </StatusPanel>
      {formOpen && (
        <SidePanel title={messages.addItem} onClose={() => setFormOpen(false)}>
          {data?.categories.length ? (
            <ItemForm
              categories={data.categories}
              personCount={
                data.members.filter((member) => member.member_type === 'PERSON')
                  .length
              }
              animalCount={
                data.members.filter((member) => member.member_type === 'ANIMAL')
                  .length
              }
              onSaved={(id) => {
                setFormOpen(false)
                setCreatedItemId(id ?? '')
              }}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            <p>{messages.addFirstCategory}</p>
          )}
        </SidePanel>
      )}
    </>
  )
}
