import { useEffect, useState } from 'react'
import Decimal from 'decimal.js'
import type { StockBatch } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { adjustBatchQuantity } from '@/services/repositories'

interface ConsumptionActionsProps {
  batch: StockBatch
  onError: (message: string) => void
}

export function ConsumptionActions({
  batch,
  onError,
}: ConsumptionActionsProps) {
  const [custom, setCustom] = useState('')
  const [undoDelta, setUndoDelta] = useState<string | null>(null)
  const [undoError, setUndoError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!undoDelta) return
    const timer = window.setTimeout(() => setUndoDelta(null), 8_000)
    return () => window.clearTimeout(timer)
  }, [undoDelta])

  const consume = async (amount: string) => {
    try {
      const quantity = new Decimal(amount)
      if (!quantity.isFinite() || !quantity.greaterThan(0)) {
        onError(messages.formQuantityInvalid)
        return
      }
      if (quantity.greaterThan(batch.quantity)) {
        onError(messages.batchAdjustmentNegative)
        return
      }
      const delta = quantity.negated().toFixed(3)
      await adjustBatchQuantity(batch.id, delta)
      setUndoDelta(delta)
      setUndoError('')
      setSaved(true)
      onError('')
    } catch (error) {
      onError(error instanceof Error ? error.message : messages.unknownError)
    }
  }

  const undo = async () => {
    if (!undoDelta) return
    try {
      await adjustBatchQuantity(
        batch.id,
        new Decimal(undoDelta).negated().toFixed(3),
      )
      setUndoDelta(null)
      setUndoError('')
      setSaved(false)
    } catch (error) {
      setUndoError(
        error instanceof Error ? error.message : messages.unknownError,
      )
    }
  }

  return (
    <div className="consume-actions">
      <button
        className="button button-small"
        type="button"
        onClick={() => void consume('1')}
        disabled={!new Decimal(batch.quantity).greaterThanOrEqualTo(1)}
      >
        {messages.consumeOne}
      </button>
      <button
        className="button button-small button-secondary"
        type="button"
        onClick={() => void consume('0.5')}
        disabled={!new Decimal(batch.quantity).greaterThanOrEqualTo('0.5')}
      >
        {messages.consumeHalf}
      </button>
      <form
        className="consume-custom"
        onSubmit={(event) => {
          event.preventDefault()
          void consume(custom.replace(',', '.'))
        }}
      >
        <label>
          <span className="sr-only">{messages.customAmount}</span>
          <input
            type="text"
            inputMode="decimal"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder={messages.customAmount}
            aria-label={messages.customAmount}
          />
        </label>
        <button className="button button-small" type="submit">
          {messages.consume}
        </button>
      </form>
      {undoDelta && (
        <div className="undo-snackbar" role="status">
          <span>
            {saved ? messages.batchConsumed : messages.adjustmentUndone}
          </span>
          <button
            className="button button-small button-secondary"
            type="button"
            onClick={() => void undo()}
          >
            {messages.undo}
          </button>
        </div>
      )}
      {undoError && (
        <p className="field-error" role="alert">
          {undoError}
        </p>
      )}
    </div>
  )
}
