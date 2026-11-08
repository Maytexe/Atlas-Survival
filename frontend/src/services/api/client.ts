import axios, { type AxiosError } from 'axios'
import type { components } from '@/types/api.generated'
import { messages } from '@/i18n/pt-BR'

export type ProblemDetails = components['schemas']['ProblemDetails']

export class ApiProblemError extends Error {
  readonly problem: ProblemDetails
  readonly status: number

  constructor(problem: ProblemDetails, status: number) {
    super(problem.detail)
    this.name = 'ApiProblemError'
    this.problem = problem
    this.status = status
  }
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) return false
  const problem = value as Record<string, unknown>
  return (
    typeof problem.type === 'string' &&
    typeof problem.title === 'string' &&
    typeof problem.status === 'number' &&
    typeof problem.detail === 'string'
  )
}

function toApiProblem(error: AxiosError<unknown>): ApiProblemError {
  const status = error.response?.status ?? 0
  if (isProblemDetails(error.response?.data)) {
    return new ApiProblemError(error.response.data, status)
  }
  return new ApiProblemError(
    {
      type: 'about:blank',
      title:
        status === 0 ? messages.offlineTitle : messages.communicationErrorTitle,
      status,
      detail: messages.syncError,
    },
    status,
  )
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(toApiProblem(error))
    }
    return Promise.reject(error)
  },
)
