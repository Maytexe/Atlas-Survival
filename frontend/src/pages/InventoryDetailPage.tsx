import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Decimal from 'decimal.js'
import { BatchForm } from '@/components/BatchForm'
import { ConsumptionActions } from '@/components/ConsumptionActions'
import { ItemForm } from '@/components/ItemForm'
import { ItemStatus } from '@/components/ItemStatus'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { calculateExpiry } from '@/domain'
import { useInventoryItem, useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import { formatDate, formatDecimal } from '@/services/format'
import { deleteBatch, deleteInventoryItem } from '@/services/repositories'
import type { StockBatch } from '@/db'

export function InventoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading } = useInventoryItem(id)
  const local = useLocalData()
  const { settings } = useSettings()
  const today = getToday(new Date(), settings?.timeZone)
  const [form, setForm] = useState<'item' | 'batch' | null>(null)
  const [editingBatch, setEditingBatch] = useState<StockBatch | undefined>()
  const [actionError, setActionError] = useState('')
  const [batchError, setBatchError] = useState('')
  const sortedBatches = data?.batches ?? []
  const firstUsable = sortedBatches.find(
    (batch) =>
      new Decimal(batch.quantity).greaterThan(0) &&
      (batch.expiration_date === null ||
        !calculateExpiry(batch.expiration_date, today).expired),
  )

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
              description={`${local.data?.categories.find((category) => category.id === data.item.category_id)?.name ?? ''} · ${data.item.unit}`}
              action={
                <div className="row-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setForm(form === 'item' ? null : 'item')}
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
            {actionError && (
              <p className="notice notice-error" role="alert">
                {actionError}
              </p>
            )}
            {form === 'item' && local.data && (
              <section className="panel form-panel">
                <ItemForm
                  item={data.item}
                  categories={local.data.categories}
                  onSaved={() => setForm(null)}
                  onCancel={() => setForm(null)}
                />
              </section>
            )}
            <section className="panel item-detail-summary">
              <ItemStatus batches={sortedBatches} today={today} />
              {data.item.description && <p>{data.item.description}</p>}
              {data.item.daily_consumption && (
                <p>
                  {messages.dailyConsumption}: {data.item.daily_consumption}
                </p>
              )}
            </section>
            <PageHeading
              title={messages.batches}
              action={
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setEditingBatch(undefined)
                    setForm(form === 'batch' ? null : 'batch')
                  }}
                >
                  {messages.addBatch}
                </button>
              }
            />
            {form === 'batch' && (
              <section className="panel form-panel">
                <BatchForm
                  inventoryItemId={data.item.id}
                  {...(editingBatch ? { batch: editingBatch } : {})}
                  onSaved={() => {
                    setForm(null)
                    setEditingBatch(undefined)
                  }}
                  onCancel={() => {
                    setForm(null)
                    setEditingBatch(undefined)
                  }}
                />
              </section>
            )}
            {batchError && (
              <p className="notice notice-error" role="alert">
                {batchError}
              </p>
            )}
            {sortedBatches.length === 0 ? (
              <p className="empty-state">{messages.noBatches}</p>
            ) : (
              <section className="batch-list" aria-label={messages.noBatches}>
                {sortedBatches.map((batch) => {
                  const expired =
                    batch.expiration_date !== null &&
                    calculateExpiry(batch.expiration_date, today).expired
                  const isFirst = batch.id === firstUsable?.id
                  return (
                    <article
                      className={`panel batch-card${isFirst ? ' batch-first' : ''}`}
                      key={batch.id}
                    >
                      <div className="batch-heading">
                        <strong>
                          {formatDecimal(new Decimal(batch.quantity))}{' '}
                          {data.item.unit}
                        </strong>
                        {isFirst && (
                          <span className="status-pill status-good">
                            {messages.firstToConsume}
                          </span>
                        )}
                        {expired && (
                          <span className="status-pill status-critical">
                            {messages.expired}
                          </span>
                        )}
                        {!expired &&
                          batch.expiration_date &&
                          calculateExpiry(batch.expiration_date, today)
                            .expiring_soon && (
                            <span className="status-pill status-warning">
                              {messages.expiringSoon}
                            </span>
                          )}
                      </div>
                      <p>
                        {messages.expirationDate}:{' '}
                        {batch.expiration_date
                          ? formatDate(
                              batch.expiration_date,
                              settings?.timeZone,
                            )
                          : messages.noExpiration}
                      </p>
                      {batch.batch_number && (
                        <p>
                          {messages.batchNumber}: {batch.batch_number}
                        </p>
                      )}
                      {batch.storage_location && (
                        <p>
                          {messages.storageLocation}: {batch.storage_location}
                        </p>
                      )}
                      <div className="row-actions">
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          onClick={() => {
                            setEditingBatch(batch)
                            setForm('batch')
                          }}
                        >
                          {messages.edit}
                        </button>
                        <button
                          className="button button-danger button-small"
                          type="button"
                          onClick={() => void removeBatch(batch.id)}
                        >
                          {messages.delete}
                        </button>
                      </div>
                      <ConsumptionActions
                        batch={batch}
                        onError={setActionError}
                      />
                    </article>
                  )
                })}
              </section>
            )}
            {actionError && (
              <p className="notice notice-error" role="alert">
                {actionError}
              </p>
            )}
          </>
        )}
      </StatusPanel>
    </>
  )
}
