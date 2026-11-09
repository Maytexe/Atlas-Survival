import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ItemForm } from '@/components/ItemForm'
import { ItemStatus } from '@/components/ItemStatus'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import { deleteInventoryItem } from '@/services/repositories'

export function InventoryPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const today = getToday(new Date(), settings?.timeZone)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState('')
  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (item) =>
          item.name
            .toLocaleLowerCase('pt-BR')
            .includes(search.toLocaleLowerCase('pt-BR')) &&
          (!categoryId || item.category_id === categoryId),
      ),
    [categoryId, data?.items, search],
  )

  const remove = async (id: string) => {
    if (!window.confirm(messages.confirmDelete)) return
    try {
      await deleteInventoryItem(id)
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
        title={messages.inventoryTitle}
        action={
          <button
            className="button"
            type="button"
            onClick={() => setShowForm((value) => !value)}
          >
            {messages.addItem}
          </button>
        }
      />
      {showForm && data && (
        <section className="panel form-panel">
          {data.categories.length ? (
            <ItemForm
              categories={data.categories}
              onSaved={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <p>{messages.addFirstCategory}</p>
          )}
        </section>
      )}
      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}
      <div className="filter-row">
        <label className="search-field">
          {messages.inventorySearch}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {messages.filterByCategory}
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
      </div>
      <StatusPanel
        loading={loading}
        error={error}
        empty={!loading && !error && items.length === 0}
        emptyMessage={
          data?.items.length ? messages.noItemsMatch : messages.noItems
        }
      >
        <section
          className="panel inventory-list"
          aria-label={messages.inventoryTitle}
        >
          {items.map((item) => {
            const batches =
              data?.batches.filter(
                (batch) => batch.inventory_item_id === item.id,
              ) ?? []
            const categoryName =
              data?.categories.find(
                (category) => category.id === item.category_id,
              )?.name ?? ''
            return (
              <article className="inventory-row" key={item.id}>
                <div className="inventory-row-main">
                  <Link
                    className="inventory-item-name"
                    to={`/estoque/${item.id}`}
                  >
                    {item.name}
                  </Link>
                  <span className="muted">
                    {categoryName} · {item.unit}
                  </span>
                  <ItemStatus batches={batches} today={today} />
                </div>
                <div className="row-actions">
                  <Link
                    className="button button-secondary button-small"
                    to={`/estoque/${item.id}`}
                  >
                    {messages.edit}
                  </Link>
                  <button
                    className="button button-danger button-small"
                    type="button"
                    onClick={() => void remove(item.id)}
                  >
                    {messages.delete}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      </StatusPanel>
    </>
  )
}
