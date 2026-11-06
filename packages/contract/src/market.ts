import { z } from 'zod'
import { LOGISTICS_CONTRACT_VERSION } from './version'

/**
 * A *fulfilment method* a market or shipment may expose — the buyer-visible way
 * a parcel is delivered, NOT the backend carrier.
 *
 * Deliberately open (`string & {}`): the backend can expose a new method such as
 * "locker" or "same_day_scheduled" WITHOUT an SDK release. The distinction the
 * client must respect:
 * - The buyer chooses a *method* (how the parcel is delivered — pickup point vs
 *   doorstep). This is buyer-facing and cannot be substituted by the backend.
 * - The backend chooses the *carrier* used to fulfil that method. That choice is
 *   never exposed as a client branch — the client follows the quote and
 *   `next_action`.
 */
export type KnownFulfilmentMethod =
  | 'pickup_point'
  | 'doorstep'
  | 'same_day'
  | 'branch_collection'

export type FulfilmentMethod = KnownFulfilmentMethod | (string & {})

export const KNOWN_FULFILMENT_METHODS: readonly KnownFulfilmentMethod[] = [
  'pickup_point',
  'doorstep',
  'same_day',
  'branch_collection',
] as const

/** Accepts any non-empty string — methods are open by contract. */
export const fulfilmentMethodSchema = z.string().min(1)

/** Market lifecycle as surfaced to clients for discovery/browsing. */
export type MarketStatus = 'active' | 'coming_soon'

export const marketStatusSchema = z.enum(['active', 'coming_soon'])

/** The currency a market transacts in. Codes are open, validated by format. */
export interface MarketCurrency {
  code: string
  minor_unit: number
  symbol: string
  locale: string
}

export const marketCurrencySchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  minor_unit: z.number().int().nonnegative(),
  symbol: z.string().min(1),
  locale: z.string().min(1),
})

/**
 * A market the platform serves. `code` and `supported_methods` are open strings
 * so adding a country never requires an SDK release. `supported_methods` is
 * informational; the authoritative, routable method set for a specific shipment
 * is what the quote endpoint returns.
 */
export interface Market {
  code: string
  name: string
  status: MarketStatus
  currency: MarketCurrency
  calling_code: string
  supported_methods: FulfilmentMethod[]
}

export const marketSchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  name: z.string().min(1),
  status: marketStatusSchema,
  currency: marketCurrencySchema,
  calling_code: z.string().regex(/^\+\d{1,4}$/),
  supported_methods: z.array(fulfilmentMethodSchema),
})

/** Response of `GET /logistics/markets` — public, cacheable market discovery. */
export interface MarketsResponse {
  version: typeof LOGISTICS_CONTRACT_VERSION
  markets: Market[]
  updated_at: string
}

export const marketsResponseSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  markets: z.array(marketSchema),
  updated_at: z.string(),
})
