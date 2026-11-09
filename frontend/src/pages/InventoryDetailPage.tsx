import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Decimal from 'decimal.js'
import { Apple, Droplet, Package } from 'lucide-react'
import { BatchCard } from '@/components/BatchCard'
import { BatchForm } from '@/components/BatchForm'
import { InfoTip } from '@/components/InfoTip'
import { ItemForm } from '@/components/ItemForm'
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
import { useInventoryItem, useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import {
  formatDate,
  formatQuantity,
  formatRelativeExpiry,
} from '@/services/format'
import { deleteBatch, deleteInventoryItem } from '@/services/repositories'
import type { StockBatch } from '@/db'

export function InventoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, error, loading } = useInventoryItem(id)
  const local = useLocalData()
  const { settings } = useSettings()
  const { goalFoodDays, goalWaterDays } = useGoals()
  const today = getToday(new Date(), settings?.timeZone)
  const [form, setForm] = useState<'item' | 'batch' | null>(null)
  const [editingBatch, setEditingBatch] = useState<StockBatch>()
  const [actionError, setActionError] = useState('')
  const [batchError, setBatchError] = useState('')
  const shouldAddStock = searchParams.get('adicionar') === 'estoque'
  const sortedBatches = data?.batches ?? []
  const snapshots = useMemo(
    () =>
      local.data
        ? toItemSnapshots(
            local.data.items,
            local.data.batches,
            local.data.members,
          )
        : [],
    [local.data],
  )
  const itemSnapshot = snapshots.find((snapshot) => snapshot.id === id)
  const available = calculateStockAvailability(
    itemSnapshot?.batches ?? [],
    today,
  ).available
  const daily = itemSnapshot ? effectiveDaily(itemSnapshot) : null
  const autonomy = itemSnapshot ? calculateAutonomy(itemSnapshot, today) : null
  const firstUsable = sortedBatches.find(
    (batch) =>
      new Decimal(batch.quantity).greaterThan(0) &&
      (batch.expiration_date === null ||
        !calculateExpiry(batch.expiration_date, today).expired),
  )
  const nextExpiration = sortedBatches.find(
    (batch) =>
      batch.expiration_date !== null &&
      new Decimal(batch.quantity).greaterThan(0) &&
      !calculateExpiry(batch.expiration_date, today).expired,
  )
  const storageLocations = Array.from(
    new Set(
      (local.data?.batches ?? [])
        .map((batch) => batch.storage_location?.trim())
        .filter((location): location is string => Boolean(location)),
    ),
  ).sort((first, second) => first.localeCompare(second, 'pt-BR'))

  const activeForm = shouldAddStock && data ? 'batch' : form

  const closeForm = () => {
    setForm(null)
    setEditingBatch(undefined)
    if (shouldAddStock) {
      const next = new URLSearchParams(searchParams)
      next.delete('adicionar')
      setSearchParams(next, { replace: true })
    }
  }

  const removeItem = async () => {
    if (!id || !window.confirm(messages.confirmDelete)) return
    try {
      await deleteInventoryItem(id)
      navigate('/estoque')
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : messages.unknownError,
      )
    }
  }

  const removeBatch = async (batchId: string) => {
    if (!window.confirm(messages.confirmDelete)) return
    try {
      await deleteBatch(batchId)
      setBatchError('')
    } catch (cause) {
      setBatchError(
        cause instanceof Error ? cause.message : messages.unknownError,
      )
    }
  }

  const TypeIcon =
    data?.item.item_kind === 'WATER'
      ? Droplet
      : data?.item.item_kind === 'FOOD'
        ? Apple
        : Package

  return (
    <>
      <Link className="back-link" to="/estoque">
        ← {messages.backToInventory}
      </Link>
      <StatusPanel
        loading={loading || local.loading}
        error={error || local.error}
        empty={!loading && !error && !data}
        emptyMessage={messages.notFound}
      >
        {data && (
          <>
            <PageHeading
              title={data.item.name}
              description={
                local.data?.categories.find(
                  (category) => category.id === data.item.category_id,
                )?.name ?? ''
              }
              action={
                <div className="row-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setForm('item')}
                  >
                    {messages.edit}
                  </button>
                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() => void removeItem()}
                  >
                    {messages.delete}
                  </button>
                </div>
              }
            />
            <p className="item-kind-heading">
              <TypeIcon size={20} aria-hidden="true" />
              {data.item.item_kind === 'WATER'
                ? messages.waterKind
                : data.item.item_kind === 'FOOD'
                  ? messages.foodKind
                  : messages.otherKind}
            </p>
            {actionError && (
              <p className="notice notice-error" role="alert">
                {actionError}
              </p>
            )}
            <section
              className="detail-measures"
              aria-label={messages.profileItem}
            >
              <div className="detail-measure">
                <span>{messages.available}</span>
                <strong>{formatQuantity(available, data.item.unit)}</strong>
              </div>
              <div className="detail-measure">
                <span className="section-title-with-info">
                  {messages.householdDailyConsumption}
                  <InfoTip
                    label={messages.consumptionInfo}
                    content={messages.consumptionInfo}
                  />
                </span>
                <strong>
                  {daily?.greaterThan(0)
                    ? `${formatQuantity(daily, data.item.unit)} / dia`
                    : messages.emptyData}
                </strong>
              </div>
              <div className="detail-measure">
                <span className="section-title-with-info">
                  {messages.autonomyShort}
                  <InfoTip
                    label={messages.autonomy}
                    content={messages.autonomyInfo}
                  />
                </span>
                <strong>
                  {autonomy === null
                    ? messages.emptyData
                    : messages.autonomyLabel.replace(
                        '{days}',
                        String(autonomy),
                      )}
                </strong>
              </div>
              <div className="detail-measure">
                <span>{messages.nextExpiration}</span>
                <strong>
                  {nextExpiration?.expiration_date
                    ? `${formatDate(nextExpiration.expiration_date, settings?.timeZone)} · ${formatRelativeExpiry(nextExpiration.expiration_date, today)}`
                    : messages.expiryNone}
                </strong>
              </div>
            </section>
            {data.item.description && (
              <p className="item-description">{data.item.description}</p>
            )}

            <div className="section-heading">
              <h2 className="section-title-with-info">
                {messages.batches}
                <InfoTip
                  label={messages.batchInfoTitle}
                  content={messages.batchInfoText}
                />
              </h2>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setEditingBatch(undefined)
                  setForm('batch')
                }}
              >
                {messages.addStock}
              </button>
            </div>
            {batchError && (
              <p className="notice notice-error" role="alert">
                {batchError}
              </p>
            )}
            {sortedBatches.length === 0 ? (
              <p className="empty-state">{messages.noBatches}</p>
            ) : (
              <section className="batch-list" aria-label={messages.batches}>
                {sortedBatches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    itemUnit={data.item.unit}
                    today={today}
                    timeZone={settings?.timeZone ?? 'America/Sao_Paulo'}
                    isFirst={batch.id === firstUsable?.id}
                    onEdit={() => {
                      setEditingBatch(batch)
                      setForm('batch')
                    }}
                    onDelete={() => void removeBatch(batch.id)}
                    onError={setActionError}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </StatusPanel>
      {activeForm === 'item' && data && local.data && (
        <SidePanel title={messages.editItemTitle} onClose={closeForm}>
          <ItemForm
            item={data.item}
            categories={local.data.categories}
            personCount={
              local.data.members.filter(
                (member) => member.member_type === 'PERSON',
              ).length
            }
            animalCount={
              local.data.members.filter(
                (member) => member.member_type === 'ANIMAL',
              ).length
            }
            onSaved={closeForm}
            onCancel={closeForm}
          />
        </SidePanel>
      )}
      {activeForm === 'batch' && data && (
        <SidePanel
          title={
            editingBatch ? messages.editBatchTitle : messages.addStockTitle
          }
          onClose={closeForm}
        >
          <BatchForm
            inventoryItemId={data.item.id}
            itemUnit={data.item.unit}
            {...(editingBatch ? { batch: editingBatch } : {})}
            storageLocations={storageLocations}
            snapshots={snapshots}
            goalFoodDays={goalFoodDays}
            goalWaterDays={goalWaterDays}
            today={today}
            onSaved={closeForm}
            onCancel={closeForm}
          />
        </SidePanel>
      )}
    </>
  )
}
