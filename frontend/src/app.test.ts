import { describe, expect, it } from 'vitest'
import { messages } from '@/i18n/pt-BR'

describe('configuração do frontend', () => {
  it('carrega as mensagens iniciais do aplicativo', () => {
    expect(messages.appName).toBe('ATLAS')
  })
})
