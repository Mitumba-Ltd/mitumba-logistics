import { z } from 'zod'
import { carrierIdSchema, type CarrierId } from './carrier'

/**
 * Dual-surface tracking metadata (the AliExpress model). Mitumba's own
 * normalized status is the authoritative surface; in addition the carrier's own
 * identifiers are passed through so the buyer can optionally track on the
 * carrier's surface:
 *
 * - `tracking_url`     — a deep link the client can render as "Track your parcel"
 * - `tracking_website` — a bare site where the buyer manually enters the number
 *                        (some carriers offer only this, not a deep link)
 * - `tracking_number`  — the carrier's reference, safe to show the buyer
 *
 * Any subset may be present; the view degrades accordingly. All are carrier
 * identity — never seller identity.
 */
export interface ParcelTracking {
  carrier: CarrierId
  carrier_name: string
  tracking_number: string | null
  tracking_url: string | null
  tracking_website: string | null
}

export const parcelTrackingSchema = z.object({
  carrier: carrierIdSchema,
  carrier_name: z.string().min(1),
  tracking_number: z.string().nullable(),
  tracking_url: z.string().nullable(),
  tracking_website: z.string().nullable(),
})
