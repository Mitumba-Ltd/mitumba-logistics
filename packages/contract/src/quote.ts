import { z } from 'zod'
import { LOGISTICS_CONTRACT_VERSION } from './version'
import { moneySchema, type Money } from './money'
import { carrierIdSchema, type CarrierId } from './carrier'
import { fulfilmentMethodSchema, type FulfilmentMethod } from './market'

/**
 * A geo point. Some methods (same-day) require coordinates; others key on
 * city/node ids. Latitude/longitude are validated to their ranges.
 */
export interface GeoPoint {
  latitude: number
  longitude: number
}

export const geoPointSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
})

/**
 * Body of `POST /logistics/quotes`. The buyer picks a METHOD; the backend routes
 * across carriers and prices each. The client never names a carrier here.
 */
export interface QuoteRequest {
  order_id: string
  order_kind?: 'retail' | 'bale'
  method: FulfilmentMethod
  origin_city_id?: string | null
  destination_city_id?: string | null
  origin?: GeoPoint
  destination?: GeoPoint
  origin_node_id?: string
  destination_node_id?: string
  weight_grams: number
}

export const quoteRequestSchema = z.object({
  order_id: z.string().min(1),
  order_kind: z.enum(['retail', 'bale']).optional(),
  method: fulfilmentMethodSchema,
  origin_city_id: z.string().nullish(),
  destination_city_id: z.string().nullish(),
  origin: geoPointSchema.optional(),
  destination: geoPointSchema.optional(),
  origin_node_id: z.string().optional(),
  destination_node_id: z.string().optional(),
  weight_grams: z.number().int().positive(),
})

/**
 * A priced, routable option. `carrier`/`carrier_name` are OBSERVABLE metadata —
 * the backend already chose this carrier; the client does not pick among
 * carriers to route, only to display or to let the buyer prefer a presented
 * option. `price` is the buyer-facing shipping price (carrier fee + markup);
 * the markup is never broken out to the client.
 */
export interface QuoteOption {
  quote_id: string
  carrier: CarrierId
  carrier_name: string
  method: FulfilmentMethod
  price: Money
  binding: boolean
  expires_at: string | null
}

export const quoteOptionSchema = z.object({
  quote_id: z.string().min(1),
  carrier: carrierIdSchema,
  carrier_name: z.string().min(1),
  method: fulfilmentMethodSchema,
  price: moneySchema,
  binding: z.boolean(),
  expires_at: z.string().nullable(),
})

/** Response of `POST /logistics/quotes`: the chosen (cheapest) option plus
 *  alternatives, each already priced. */
export interface QuoteResponse {
  version: typeof LOGISTICS_CONTRACT_VERSION
  chosen: QuoteOption
  alternatives: QuoteOption[]
}

export const quoteResponseSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  chosen: quoteOptionSchema,
  alternatives: z.array(quoteOptionSchema),
})

/**
 * Body of `POST /logistics/parcels` — book the carrier chosen by a prior quote.
 * The sender is Mitumba's masked identity (the backend's caller supplies it);
 * the client passes the quote id, the real parcel weight, and the recipient.
 */
export interface CreateParcelResponse {
  version: typeof LOGISTICS_CONTRACT_VERSION
  parcel_id: string
  status: string
  carrier: CarrierId
  uses_collection_code: boolean
  tracking: {
    carrier_name: string
    tracking_number: string | null
    tracking_url: string | null
    tracking_website: string | null
  }
}

export const createParcelResponseSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  parcel_id: z.string().min(1),
  status: z.string().min(1),
  carrier: carrierIdSchema,
  uses_collection_code: z.boolean(),
  tracking: z.object({
    carrier_name: z.string().min(1),
    tracking_number: z.string().nullable(),
    tracking_url: z.string().nullable(),
    tracking_website: z.string().nullable(),
  }),
})
