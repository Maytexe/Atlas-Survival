import type { components } from '@/types/api.generated'
import { messages } from '@/i18n/pt-BR'
import { http } from './client'

export type SyncMutation = components['schemas']['MutationCreate']
export type PullResponse = components['schemas']['PullResponse']

export type PushResult =
  | { mutation_id: string; status: 'applied' }
  | { mutation_id: string; status: 'duplicate' }
  | { mutation_id: string; status: 'stale' }
  | {
      mutation_id: string
      status: 'rejected'
      problem: components['schemas']['ProblemDetails']
    }

export interface SyncApi {
  push(mutations: SyncMutation[]): Promise<PushResult[]>
  pull(cursor: number): Promise<PullResponse>
  health(): Promise<void>
}

function isPushResult(value: unknown): value is PushResult {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.mutation_id !== 'string') return false
  if (
    candidate.status === 'applied' ||
    candidate.status === 'duplicate' ||
    candidate.status === 'stale'
  ) {
    return true
  }
  if (
    candidate.status !== 'rejected' ||
    typeof candidate.problem !== 'object' ||
    candidate.problem === null
  ) {
    return false
  }
  const problem = candidate.problem as Record<string, unknown>
  return (
    typeof problem.type === 'string' &&
    typeof problem.title === 'string' &&
    typeof problem.status === 'number' &&
    typeof problem.detail === 'string'
  )
}

export const syncApi: SyncApi = {
  async push(mutations) {
    const response = await http.post<{ results: unknown[] }>('/sync/push', {
      mutations,
    })
    if (
      !Array.isArray(response.data.results) ||
      !response.data.results.every(isPushResult)
    ) {
      throw new Error(messages.invalidSyncResponse)
    }
    return response.data.results
  },
  async pull(cursor) {
    const response = await http.get<PullResponse>('/sync/pull', {
      params: { cursor },
    })
    return response.data
  },
  async health() {
    await http.get('/health', { timeout: 3_000 })
  },
}
