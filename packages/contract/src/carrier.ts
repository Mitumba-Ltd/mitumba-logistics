import { z } from 'zod'

/**
 * A carrier that fulfils shipments. This is OBSERVABLE METADATA — the backend
 * chooses which carrier moves a parcel; the client never selects one and never
 * branches on one to drive the flow.
 *
 * Deliberately open (`string & {}`): the backend can onboard a new carrier
 * WITHOUT an SDK release. Revealing the carrier to the buyer is safe and
 * intended — it is the carrier (e.g. Pickup Mtaani), never the seller, and lets
 * the buyer cross-check tracking on the carrier's own surface.
 *
 * Do NOT write an exhaustive carrier `switch` to drive behaviour. Render the
 * carrier name for display; follow the quote and `next_action` for logic.
 */
export type KnownCarrier = 'pickup_mtaani' | 'uber_direct'

export type CarrierId = KnownCarrier | (string & {})

export const KNOWN_CARRIERS: readonly KnownCarrier[] = ['pickup_mtaani', 'uber_direct'] as const

/** Accepts any non-empty string — carrier ids are open by contract. */
export const carrierIdSchema = z.string().min(1)
