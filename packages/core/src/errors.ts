import type { LogisticsErrorBody } from '@mitumbadotafrica/logistics-contract'

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

  constructor(status: number, body: LogisticsErrorBody) {
    super(body.message ?? body.error)
    this.name = 'LogisticsError'
    this.code = body.error
    this.status = status
    this.details = body.details
    this.reason = body.reason
  }

  /** True for a temporary backend condition (503), e.g. no carriers configured. */
  get isTemporary(): boolean {
    return this.status === 503
  }
}
