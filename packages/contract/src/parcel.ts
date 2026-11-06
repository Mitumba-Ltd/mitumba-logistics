import { z } from 'zod'
import { LOGISTICS_CONTRACT_VERSION } from './version'
import { parcelTrackingSchema, type ParcelTracking } from './tracking'
import { type NextActionType } from './next-action'

/**
 * Normalized parcel lifecycle status. The engine owns this vocabulary; each
 * carrier's native statuses map onto it. `action_required` is NON-TERMINAL and
 * resumable (e.g. a carrier "recipient unreachable" that the buyer reschedules);
 * only `delivered`, `returned`, `cancelled`, `lost` are terminal.
 *
 * Open string by contract so the backend can add a status without an SDK
 * release; the client must treat an unknown status as non-terminal and keep
 * polling rather than inventing a terminal outcome.
 */
export type KnownParcelStatus =
  | 'created'
  | 'awaiting_dropoff'
  | 'in_transit'
  | 'out_for_delivery'
  | 'action_required'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'lost'

export type ParcelStatus = KnownParcelStatus | (string & {})

export const KNOWN_PARCEL_STATUSES: readonly KnownParcelStatus[] = [
  'created',
  'awaiting_dropoff',
  'in_transit',
  'out_for_delivery',
  'action_required',
  'delivered',
  'returned',
  'cancelled',
  'lost',
] as const

/** The terminal statuses. A client must not convert any other status to a
 *  terminal outcome by elapsed time alone. */
export const TERMINAL_PARCEL_STATUSES: readonly KnownParcelStatus[] = [
  'delivered',
  'returned',
  'cancelled',
  'lost',
] as const

export const parcelStatusSchema = z.string().min(1)

/** Is this a known terminal status? Unknown statuses are treated as non-terminal. */
export function isTerminalParcelStatus(status: ParcelStatus): boolean {
  return (TERMINAL_PARCEL_STATUSES as readonly string[]).includes(status)
}

/**
 * Buyer-facing parcel view returned by `GET /logistics/parcels/:id`. Mitumba's
 * normalized `status` is authoritative; `tracking` carries the carrier
 * passthrough. `next_action_type` is set only while the parcel is parked in
 * `action_required`. The collection code is NEVER in this response — only
 * whether one exists.
 */
export interface ParcelView {
  version: typeof LOGISTICS_CONTRACT_VERSION
  parcel_id: string
  status: ParcelStatus
  tracking: ParcelTracking
  next_action_type: NextActionType | null
  has_collection_code: boolean
  updated_at: string
}

export const parcelViewSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  parcel_id: z.string().min(1),
  status: parcelStatusSchema,
  tracking: parcelTrackingSchema,
  next_action_type: z.string().nullable(),
  has_collection_code: z.boolean(),
  updated_at: z.string(),
})

/** A party on a shipment — the recipient (buyer). Sender is always Mitumba's
 *  masked identity, set by the backend; the client never supplies a seller. */
export interface ShipmentParty {
  name: string
  phone: string
  city_id?: string | null
  node_id?: string
  address_line?: string
  point?: { latitude: number; longitude: number }
}

/** Generic E.164: a leading '+' and 1-15 digits. The backend validates the
 *  number against the shipment's market. */
export const E164_PHONE = /^\+[1-9]\d{1,14}$/

export const shipmentPartySchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(E164_PHONE),
  city_id: z.string().nullish(),
  node_id: z.string().optional(),
  address_line: z.string().optional(),
  point: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
})
