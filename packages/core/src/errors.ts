import { moneySchema, type LogisticsErrorBody, type Money } from '@mitumbadotafrica/logistics-contract'

/**
 * Thrown for any non-2xx API response and for network/transport failures.
 * `code` is the machine-readable error code from the API envelope (`{ error }`).
 * `status` is 0 for network-level failures. `reason` carries the backend's
 * sub-reason where present (e.g. `no_route` → `not_serviceable`).
 */
export class LogisticsError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: unknown
  public readonly reason?: string
  /** The whole error body, for refusals that carry more than a code (e.g. `fee_changed`). */
  public readonly body: Readonly<Record<string, unknown>>

  constructor(status: number, body: LogisticsErrorBody) {
    super(body.message ?? body.error)
    this.name = 'LogisticsError'
    this.code = body.error
    this.status = status
    this.details = body.details
    this.reason = body.reason
    this.body = body as unknown as Readonly<Record<string, unknown>>
  }

  /** True for a temporary backend condition (503), e.g. no carriers configured. */
  get isTemporary(): boolean {
    return this.status === 503
  }
}

/**
 * The new fee when marking a parcel ready with deliver for me was refused because the live fee
 * changed (`fee_changed`), or null for any other error. Show it, and retry with it once confirmed.
 */
export function feeChangedOf(error: unknown): { fee: Money; payout_after_fee: Money } | null {
  if (!(error instanceof LogisticsError) || error.code !== 'fee_changed') return null
  const fee = moneySchema.safeParse(error.body.fee)
  const payout = moneySchema.safeParse(error.body.payout_after_fee)
  return fee.success && payout.success ? { fee: fee.data, payout_after_fee: payout.data } : null
}
