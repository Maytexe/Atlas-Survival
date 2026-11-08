import type { components } from '@/types/api.generated'

export type HouseholdMember = components['schemas']['MemberRead']
export type Category = components['schemas']['CategoryRead']
export type InventoryItem = components['schemas']['InventoryRead']
export type StockBatch = components['schemas']['BatchRead']
export type Mutation = components['schemas']['MutationCreate']
export type ProblemDetails = components['schemas']['ProblemDetails']
export type EntityName = Mutation['entity']
export type MutationOperation = Mutation['op']
export type OutboxStatus = 'pending' | 'rejected' | 'blocked'

export interface OutboxEntry extends Mutation {
  seq?: number
  status: OutboxStatus
  problem?: ProblemDetails
}

export interface MetaRecord {
  key: string
  value: unknown
}
