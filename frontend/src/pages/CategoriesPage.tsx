import { useState } from 'react'
import { CategoryForm } from '@/components/CategoryForm'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { useLocalData } from '@/hooks/use-local-data'
import { messages } from '@/i18n/pt-BR'
import { deleteCategory } from '@/services/repositories'
import type { Category } from '@/db'

export function CategoriesPage() {
  const { data, error, loading } = useLocalData()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category>()
  const [actionError, setActionError] = useState('')

  const remove = async (categoryId: string) => {
    if (!window.confirm(messages.confirmCategoryDelete)) return
    try {
      await deleteCategory(categoryId)
      setActionError('')
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : messages.categoryInUse,
      )
    }
  }

  return (
    <>
      <PageHeading
        title={messages.categories}
        action={
          <button
            className="button"
            type="button"
            onClick={() => {
              setEditing(undefined)
              setFormOpen((open) => !open)
            }}
          >
            {messages.addCategory}
          </button>
        }
      />
      {formOpen && (
        <section className="panel form-panel">
          <CategoryForm
            {...(editing ? { category: editing } : {})}
            onSaved={() => {
              setFormOpen(false)
              setEditing(undefined)
            }}
            onCancel={() => {
              setFormOpen(false)
              setEditing(undefined)
            }}
          />
        </section>
      )}
      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}
      <StatusPanel
        loading={loading}
        error={error}
        empty={!loading && !error && data?.categories.length === 0}
        emptyMessage={messages.noCategories}
      >
        <section className="panel record-list">
          {data?.categories.map((category) => {
            const itemCount = data.items.filter(
              (item) => item.category_id === category.id,
            ).length
            return (
              <article className="record-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  {category.description && <p>{category.description}</p>}
                  <p className="muted">
                    {messages.activeItemCount.replace(
                      '{count}',
                      String(itemCount),
                    )}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={() => {
                      setEditing(category)
                      setFormOpen(true)
                    }}
                  >
                    {messages.edit}
                  </button>
                  <button
                    className="button button-danger button-small"
                    type="button"
                    onClick={() => void remove(category.id)}
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
