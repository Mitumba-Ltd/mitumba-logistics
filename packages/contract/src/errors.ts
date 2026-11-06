import { z } from 'zod'

/** Error codes emitted by the quote endpoint. Responses are `{ error: <code> }`. */
export type QuoteErrorCode =
  | 'invalid_input'
  | 'no_carriers_configured'
  | 'no_route'

/** Error codes emitted by the parcel-creation endpoint. */
export type CreateParcelErrorCode =
  | 'invalid_input'
  | 'quote_not_found'
  | 'carrier_unavailable'
  | 'carrier_booking_failed'

/** Error codes emitted by the parcel-view endpoint. */
export type ParcelViewErrorCode = 'parcel_not_found'

/** Any documented logistics error code. */
export type LogisticsErrorCode = QuoteErrorCode | CreateParcelErrorCode | ParcelViewErrorCode

/** The standard error envelope returned by the API on non-2xx responses. */
export interface LogisticsErrorBody {
  error: string
  message?: string
  details?: unknown
  /** For `no_route`, the backend's reason (e.g. not_serviceable). */
  reason?: string
}

export const logisticsErrorBodySchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
  reason: z.string().optional(),
})

export const QUOTE_ERROR_STATUS: Record<QuoteErrorCode, number> = {
  invalid_input: 400,
  no_carriers_configured: 503,
  no_route: 422,
}

export const CREATE_PARCEL_ERROR_STATUS: Record<CreateParcelErrorCode, number> = {
  invalid_input: 400,
  quote_not_found: 404,
  carrier_unavailable: 503,
  carrier_booking_failed: 502,
}
