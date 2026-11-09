import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InfoTip } from './InfoTip'

const label = 'Sobre a autonomia'
const content = 'Só contam itens com consumo informado.'

describe('InfoTip', () => {
  it('abre ao passar o mouse e associa a descrição por aria', async () => {
    const user = userEvent.setup()
    render(<InfoTip label={label} content={content} />)
    const button = screen.getByRole('button', { name: label })
    await user.hover(button)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toBe(content)
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
  })

  it('abre ao receber foco e fecha com Escape', async () => {
    const user = userEvent.setup()
    render(<InfoTip label={label} content={content} />)
    const button = screen.getByRole('button', { name: label })
    button.focus()
    expect(await screen.findByRole('tooltip')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('alterna ao tocar e fecha ao tocar fora', () => {
    render(
      <>
        <InfoTip label={label} content={content} />
        <button type="button">Fora</button>
      </>,
    )
    const button = screen.getByRole('button', { name: label })
    fireEvent.pointerDown(button, { pointerType: 'touch' })
    fireEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fora' }), {
      pointerType: 'touch',
    })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
