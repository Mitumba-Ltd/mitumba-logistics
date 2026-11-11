import { z } from 'zod'
import { LOGISTICS_CONTRACT_VERSION } from './version'
import { moneySchema, type Money } from './money'
import { carrierIdSchema, type CarrierId } from './carrier'
import { fulfilmentMethodSchema, type FulfilmentMethod } from './market'

/**
 * Basket quotes: real-time delivery prices per shop basket, BEFORE any order
 * exists, so the buyer picks delivery (door, or a pickup hub) before paying.
 *
 * - Origin is always the shop. The backend derives it; the client never sends it.
 * - Destination is the buyer's saved address, a "Deliver to" point, or a pickup
 *   hub chosen from the options.
 * - One delivery per shop: each shop's basket is its own parcel.
 * - The buyer picks a METHOD (and, for pickup methods, a hub). The backend has
 *   already chosen the carrier; `carrier` is observable metadata.
 * - A basket the backend cannot serve is `unavailable` with a reason. It is
 *   never priced by default.
 */

/** One listing in a shop basket. */
export interface BasketItem {
  listing_id: string
  quantity: number
}

export const basketItemSchema = z.object({
  listing_id: z.string().min(1),
  quantity: z.number().int().min(1),
})

/** Where the buyer wants the baskets: a saved address, or a "Deliver to" point.
 *  A point names its region (county in Kenya); without one it cannot be placed
 *  in the market and every basket answers `outside_market`. */
export type BasketDestination =
  | { type: 'address'; address_id: string }
  | { type: 'point'; latitude: number; longitude: number; region?: string }

export const basketDestinationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('address'), address_id: z.string().min(1) }),
  z.object({
    type: z.literal('point'),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    region: z.string().min(1).optional(),
  }),
])

/** Body of `POST /logistics/basket-quotes`. One basket per shop, at most once. */
export interface BasketQuoteRequest {
  market_code: string
  destination: BasketDestination
  baskets: Array<{ store_id: string; items: BasketItem[] }>
}

export const basketQuoteRequestSchema = z.object({
  market_code: z.string().regex(/^[A-Z]{2}$/),
  destination: basketDestinationSchema,
  baskets: z
    .array(z.object({ store_id: z.string().min(1), items: z.array(basketItemSchema).min(1) }))
    .min(1),
})

/** A collection point (agent, station, branch) a pickup option delivers to. */
export interface PickupHub {
  node_id: string
  name: string
  address: string
  latitude: number
  longitude: number
  opening_hours?: string
}

export const pickupHubSchema = z.object({
  node_id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  opening_hours: z.string().optional(),
})

/** Estimated delivery time in whole days, when the carrier gives one. */
export interface DeliveryEta {
  min_days: number
  max_days: number
}

export const deliveryEtaSchema = z.object({
  min_days: z.number().int().nonnegative(),
  max_days: z.number().int().nonnegative(),
})

/**
 * One priced delivery option for a basket. Pickup methods have one option per
 * nearby hub (`hub` set); door methods have one option and no hub. Pass the
 * picked option's `quote_id` to checkout. It is bound to this buyer, shop,
 * market, destination and these exact items: changing any of them needs a new
 * quote. `expires_at` is when an unpicked quote stops being claimable.
 */
export interface BasketQuoteOption {
  quote_id: string
  method: FulfilmentMethod
  carrier: CarrierId
  carrier_name: string
  price: Money
  expires_at: string
  eta?: DeliveryEta
  hub?: PickupHub
}

export const basketQuoteOptionSchema = z.object({
  quote_id: z.string().min(1),
  method: fulfilmentMethodSchema,
  carrier: carrierIdSchema,
  carrier_name: z.string().min(1),
  price: moneySchema,
  expires_at: z.string().min(1),
  eta: deliveryEtaSchema.optional(),
  hub: pickupHubSchema.optional(),
})

/** Why a basket cannot be delivered. Open: tolerate a reason you do not know. */
export type KnownBasketUnavailableReason = 'no_carrier_for_lane' | 'outside_market' | 'listing_unavailable'
export type BasketUnavailableReason = KnownBasketUnavailableReason | (string & {})

/** The delivery answer for one shop basket. */
export interface BasketQuote {
  store_id: string
  status: 'available' | 'unavailable'
  reason?: BasketUnavailableReason
  options: BasketQuoteOption[]
}

export const basketQuoteSchema = z.object({
  store_id: z.string().min(1),
  status: z.enum(['available', 'unavailable']),
  reason: z.string().min(1).optional(),
  options: z.array(basketQuoteOptionSchema),
})

/** Response of `POST /logistics/basket-quotes`, baskets in request order. */
export interface BasketQuoteResponse {
  version: typeof LOGISTICS_CONTRACT_VERSION
  market_code: string
  baskets: BasketQuote[]
}

export const basketQuoteResponseSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  market_code: z.string().regex(/^[A-Z]{2}$/),
  baskets: z.array(basketQuoteSchema),
})

// ── Seller data the backend prices baskets from ────────────────────────────────

/** Where a shop's parcels start. Without coordinates, baskets are priced from the
 *  shop's city only, and same-day riders do not serve the shop. */
export interface StoreOrigin {
  store_id: string
  latitude: number | null
  longitude: number | null
  address_line: string | null
  /** The pickup agent the seller drops parcels at. */
  dropoff_node_id: string | null
  updated_at: string | null
}

export const storeOriginSchema = z.object({
  store_id: z.string().min(1),
  latitude: z.number().gte(-90).lte(90).nullable(),
  longitude: z.number().gte(-180).lte(180).nullable(),
  address_line: z.string().nullable(),
  dropoff_node_id: z.string().nullable(),
  updated_at: z.string().nullable(),
})

/** Body of `PUT /logistics/stores/:id/origin`: the whole origin. Latitude and
 *  longitude are both set or both null. */
export type StoreOriginInput = Omit<StoreOrigin, 'store_id' | 'updated_at'>

export const storeOriginInputSchema = z
  .object({
    latitude: z.number().gte(-90).lte(90).nullable(),
    longitude: z.number().gte(-180).lte(180).nullable(),
    address_line: z.string().min(1).max(512).nullable(),
    dropoff_node_id: z.string().min(1).max(128).nullable(),
  })
  .refine((origin) => (origin.latitude === null) === (origin.longitude === null), 'latitude and longitude go together')

/** A listing's package size. `small` ~500 g, `medium` ~2 kg, `large` ~10 kg, `oversize` ~20 kg. */
export type PackageSize = 'small' | 'medium' | 'large' | 'oversize'

export const PACKAGE_SIZES: readonly PackageSize[] = ['small', 'medium', 'large', 'oversize'] as const

export const packageSizeSchema = z.enum(['small', 'medium', 'large', 'oversize'])

/** A listing's package size, and whether the seller set it or it is the
 *  listing category's default. */
export interface ListingPackage {
  listing_id: string
  package_size: PackageSize
  source: 'seller' | 'category_default'
}

export const listingPackageSchema = z.object({
  listing_id: z.string().min(1),
  package_size: packageSizeSchema,
  source: z.enum(['seller', 'category_default']),
})
