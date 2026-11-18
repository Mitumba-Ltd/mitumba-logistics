import { z } from 'zod'
import { LOGISTICS_CONTRACT_VERSION } from './version'
import { moneySchema, type Money } from './money'
import { parcelStatusSchema, type ParcelStatus } from './parcel'
import type { CarrierId } from './carrier'
import type { FulfilmentMethod } from './market'

/**
 * An order's parcel, as `GET /logistics/orders/:orderId/parcel` returns it. The
 * same parcel reads differently by who asks: the shop sees where to hand it over
 * and only the buyer's region; the buyer sees their own destination and never
 * the shop's handover details. The collection code is never in either view.
 */

/** The partner's own tracking references, any of which may be missing. */
export interface OrderParcelTracking {
  tracking_number: string | null
  tracking_url: string | null
  tracking_website: string | null
}

/** Where the parcel goes. A point is a pickup point or branch; a door is an address. */
export type OrderParcelDestination =
  | { kind: 'point'; name: string | null; address: string | null }
  /** The shop's view of a door destination: the region only. */
  | { kind: 'door'; region: string }
  /** The buyer's view of their own door destination. */
  | { kind: 'door'; label: string; line1: string; city: string; region: string }

/** How the parcel reaches the partner's first point (point methods only). */
export type FirstMileMode = 'self_drop' | 'deliver_for_me'

export interface OrderParcelFirstMile {
  mode: FirstMileMode
  /** Deliver for me: the collection fee, taken from the shop's payout. */
  fee?: Money
  /** Deliver for me: the collection partner. */
  partner?: CarrierId | null
}

/** The handover a counter partner records: the waybill and the fare paid. */
export interface OrderParcelCounterReceipt {
  waybill_number: string
  fare: Money
  /** Who paid the fare at the counter. */
  paid_by: 'seller' | 'collection_partner'
}

/** The partner's first point, where the shop drops a point-method parcel off. */
export interface OrderParcelOriginPoint {
  node_id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

/** The shop's part: get the parcel ready and hand it over before the deadline. */
export interface OrderParcelHandover {
  /** When the parcel must be with the partner (ISO 8601). */
  deadline: string | null
  /** The partner's rider collects at the shop's stall (door methods): nothing to drop off. */
  collected_at_stall: boolean
  /** Where to drop off, for a point method. */
  origin_point: OrderParcelOriginPoint | null
  /** The shop has done its part: chosen the first mile, or the partner is booked to collect. */
  ready: boolean
  first_mile: OrderParcelFirstMile | null
  /** Set once a counter partner's handover is recorded. */
  counter_receipt: OrderParcelCounterReceipt | null
}

interface OrderParcelViewBase {
  version: typeof LOGISTICS_CONTRACT_VERSION
  parcel_id: string
  order_id: string
  status: ParcelStatus
  method: FulfilmentMethod
  carrier: CarrierId
  /** The partner's display name. */
  carrier_name: string
  /** `counter` partners take parcels at a counter and need the waybill recorded. */
  tier: 'api' | 'counter' | null
  tracking: OrderParcelTracking
  eta: { min_days: number; max_days: number } | null
  destination: OrderParcelDestination
  updated_at: string
}

/** The shop's view: with the handover. */
export interface ShopOrderParcelView extends OrderParcelViewBase {
  handover: OrderParcelHandover
}

/** The buyer's view: no handover. */
export type BuyerOrderParcelView = OrderParcelViewBase

export type OrderParcelView = ShopOrderParcelView | BuyerOrderParcelView

/** Whether a view is the shop's (it carries the handover). */
export function isShopParcelView(view: OrderParcelView): view is ShopOrderParcelView {
  return 'handover' in view
}

/** Why deliver for me is not offered. Open: an unknown reason reads as unavailable. */
export type KnownDeliverForMeUnavailable =
  | 'door_collection'
  | 'no_collection_partner'
  | 'stall_location_missing'
  | 'seller_phone_missing'
  | 'collection_unavailable'
  | 'fee_not_below_item_amount'

export type DeliverForMeUnavailable = KnownDeliverForMeUnavailable | (string & {})

/**
 * `GET /logistics/parcels/:id/deliver-for-me`: whether a rider can collect the
 * parcel from the stall, for what fee, and what the shop is paid after it.
 */
export type DeliverForMeOffer =
  | {
      offered: true
      partner: CarrierId
      partner_name: string
      fee: Money
      item_amount: Money
      payout_after_fee: Money
    }
  | { offered: false; reason: DeliverForMeUnavailable; item_amount: Money }

/**
 * `POST /logistics/parcels/:id/ready`. A point-method parcel needs `first_mile`;
 * a door parcel takes none (the rider collects at the stall). Deliver for me
 * carries the fee the shop was shown: a different live fee is refused with
 * `fee_changed`, carrying the new fee, so the shop confirms it again.
 */
export interface MarkParcelReadyInput {
  first_mile?: FirstMileMode
  expected_fee_minor?: number
}

/** `POST /logistics/parcels/:id/handover`: a counter partner's waybill and fare. */
export interface RecordCounterHandoverInput {
  waybill_number: string
  /** The fare paid at the counter, in minor units of the order's currency. */
  fare_minor: number
}

const pointDestinationSchema = z.object({ kind: z.literal('point'), name: z.string().nullable(), address: z.string().nullable() })
const doorRegionSchema = z.object({ kind: z.literal('door'), region: z.string() }).strict()
const doorAddressSchema = z.object({ kind: z.literal('door'), label: z.string(), line1: z.string(), city: z.string(), region: z.string() })

const orderParcelBaseSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  parcel_id: z.string().min(1),
  order_id: z.string().min(1),
  status: parcelStatusSchema,
  method: z.string().min(1),
  carrier: z.string().min(1),
  carrier_name: z.string(),
  tier: z.enum(['api', 'counter']).nullable(),
  tracking: z.object({ tracking_number: z.string().nullable(), tracking_url: z.string().nullable(), tracking_website: z.string().nullable() }),
  eta: z.object({ min_days: z.number().int().nonnegative(), max_days: z.number().int().nonnegative() }).nullable(),
  destination: z.union([pointDestinationSchema, doorRegionSchema, doorAddressSchema]),
  updated_at: z.string(),
})

export const orderParcelHandoverSchema = z.object({
  deadline: z.string().nullable(),
  collected_at_stall: z.boolean(),
  origin_point: z.object({ node_id: z.string(), name: z.string(), address: z.string(), latitude: z.number(), longitude: z.number() }).nullable(),
  ready: z.boolean(),
  first_mile: z.object({
    mode: z.enum(['self_drop', 'deliver_for_me']),
    fee: moneySchema.optional(),
    partner: z.string().nullable().optional(),
  }).nullable(),
  counter_receipt: z.object({
    waybill_number: z.string(),
    fare: moneySchema,
    paid_by: z.enum(['seller', 'collection_partner']),
  }).nullable(),
})

export const orderParcelViewSchema = z.union([
  orderParcelBaseSchema.extend({ handover: orderParcelHandoverSchema }),
  // The buyer's view never has a handover: one that fails the shop's schema is not a buyer's view.
  orderParcelBaseSchema.extend({ handover: z.undefined().optional() }),
])

export const deliverForMeOfferSchema = z.union([
  z.object({
    offered: z.literal(true),
    partner: z.string().min(1),
    partner_name: z.string(),
    fee: moneySchema,
    item_amount: moneySchema,
    payout_after_fee: moneySchema,
  }),
  z.object({ offered: z.literal(false), reason: z.string().min(1), item_amount: moneySchema }),
])
