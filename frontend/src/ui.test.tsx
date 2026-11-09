import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockBatch } from '@/db'
import { StatusPanel } from '@/components/StatusPanel'
import { SyncBadge } from '@/components/SyncBadge'
import { BatchForm } from '@/components/BatchForm'
import { ConsumptionActions } from '@/components/ConsumptionActions'
import { SettingsPage } from '@/pages/SettingsPage'
import { messages } from '@/i18n/pt-BR'
import { useSyncStore } from '@/store/sync-store'

const mocks = vi.hoisted(() => ({
  createBatch: vi.fn(),
  updateBatch: vi.fn(),
  adjustBatchQuantity: vi.fn(),
}))

vi.mock('@/services/repositories', () => ({
  createBatch: mocks.createBatch,
  updateBatch: mocks.updateBatch,
  adjustBatchQuantity: mocks.adjustBatchQuantity,
}))

const batch: StockBatch = {
  id: 'batch-1',
  inventory_item_id: 'item-1',
  quantity: '2.000',
  expiration_date: '2027-01-10',
  batch_number: null,
  storage_location: null,
  created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-01-01T12:00:00Z',
  client_updated_at: '2026-01-01T12:00:00Z',
  change_seq: 1,
  deleted_at: null,
}

describe('interface da etapa 5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createBatch.mockResolvedValue(batch)
    mocks.adjustBatchQuantity.mockResolvedValue(undefined)
  })

  it('salva lote com quantidade decimal usando vírgula e validade', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(
      <BatchForm
        inventoryItemId="item-1"
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText(messages.quantity), '1,5')
    await user.type(
      screen.getByLabelText(messages.expirationDate),
      '2027-03-15',
    )
    await user.click(screen.getByRole('button', { name: messages.save }))

    await waitFor(() => {
      expect(mocks.createBatch).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          quantity: '1.500',
          expiration_date: '2027-03-15',
        }),
      )
    })
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('rejeita quantidade negativa no formulário de lote', async () => {
    const user = userEvent.setup()
    render(
      <BatchForm
        inventoryItemId="item-1"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText(messages.quantity), '-1')
    await user.click(screen.getByRole('button', { name: messages.save }))

    expect(await screen.findByText(messages.formQuantityNegative)).toBeTruthy()
    expect(mocks.createBatch).not.toHaveBeenCalled()
  })

  it('permite desfazer um consumo registrado como ADJUST compensatório', async () => {
    const user = userEvent.setup()
    render(<ConsumptionActions batch={batch} onError={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: messages.consumeOne }))
    await user.click(await screen.findByRole('button', { name: messages.undo }))

    await waitFor(() => {
      expect(mocks.adjustBatchQuantity).toHaveBeenNthCalledWith(
        1,
        batch.id,
        '-1.000',
      )
      expect(mocks.adjustBatchQuantity).toHaveBeenNthCalledWith(
        2,
        batch.id,
        '1.000',
      )
    })
  })

  it('mostra os estados vazio e de erro das listas', () => {
    const { rerender } = render(
      <StatusPanel empty emptyMessage={messages.noMembers}>
        <p>dados</p>
      </StatusPanel>,
    )
    expect(screen.getByText(messages.noMembers)).toBeTruthy()
    rerender(
      <StatusPanel error={new Error('falha')}>
        <p>dados</p>
      </StatusPanel>,
    )
    expect(screen.getByRole('alert').textContent).toContain(messages.loadError)
  })

  it.each([
    ['Online', messages.syncOnline],
    ['Offline', messages.syncOffline],
    ['Sincronizando', messages.syncRunning],
    ['Erro', messages.syncFailed],
  ] as const)(
    'exibe o badge de sincronização no estado %s',
    async (state, label) => {
      useSyncStore.getState().setState(state)
      render(<SyncBadge />)
      await waitFor(() => expect(screen.getByText(label)).toBeTruthy())
      expect(screen.getByRole('status').getAttribute('aria-live')).toBe(
        'polite',
      )
    },
  )

  it('informa quando o backup selecionado é inválido', async () => {
    render(<SettingsPage />)
    await screen.findByLabelText(messages.lowStockDays)

    const file = new File(['not-json'], 'backup.json', {
      type: 'application/json',
    })
    fireEvent.change(screen.getByLabelText(messages.chooseBackup), {
      target: { files: [file] },
    })

    expect((await screen.findByRole('alert')).textContent).toContain(
      messages.invalidBackup,
    )
  })
})
