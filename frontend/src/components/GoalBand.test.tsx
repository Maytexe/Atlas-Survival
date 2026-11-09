import Decimal from 'decimal.js'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AutonomyAggregate, GoalResult } from '@/domain/types'
import { messages } from '@/i18n/pt-BR'
import { GoalBand } from './GoalBand'

const autonomy: AutonomyAggregate = {
  item_kind: 'WATER',
  dimension: 'VOLUME',
  days: 2,
  available_base: new Decimal(6000),
  daily_base: new Decimal(3000),
  coverage_count: 3,
  total_items: 5,
  coverage_label: 'calculado com 3 de 5 itens',
  limiting_item: 'water-item',
}

function goal(status: GoalResult['status']): GoalResult {
  return {
    item_kind: 'WATER',
    dimension: 'VOLUME',
    base_unit: 'ml',
    goal_days: 3,
    status,
    available_base: new Decimal(6000),
    daily_base: new Decimal(3000),
    needed_base: new Decimal(9000),
    missing_base: new Decimal(3000),
    partial_coverage: status === 'BELOW',
    coverage_count: 3,
    total_items: 5,
    limiting_item: 'water-item',
  }
}

function renderBand(result?: GoalResult) {
  return render(
    <MemoryRouter>
      <GoalBand
        kind="WATER"
        {...(result ? { goal: result } : {})}
        {...(result?.status === 'NO_DATA' ? {} : { autonomy })}
        inventory={[]}
        onEdit={() => undefined}
      />
    </MemoryRouter>,
  )
}

describe('faixa de autonomia', () => {
  it('mostra o estado sem meta', () => {
    renderBand()
    expect(screen.getByText(messages.goalMissing)).toBeTruthy()
    expect(screen.getByRole('button', { name: messages.setGoal })).toBeTruthy()
  })

  it('mostra o estado sem dados', () => {
    renderBand(goal('NO_DATA'))
    expect(screen.getByText(messages.goalNoData)).toBeTruthy()
  })

  it('mostra meta atingida', () => {
    renderBand(goal('MET'))
    expect(
      screen.getByText(messages.goalMet.replace('{days}', '3')),
    ).toBeTruthy()
  })

  it('mostra falta formatada e cobertura parcial', () => {
    renderBand(goal('BELOW'))
    expect(
      screen.getByText(
        messages.goalBelow.replace('{missing}', '3 L').replace('{days}', '3'),
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        messages.goalPartial.replace('{covered}', '3').replace('{total}', '5'),
      ),
    ).toBeTruthy()
  })
})
