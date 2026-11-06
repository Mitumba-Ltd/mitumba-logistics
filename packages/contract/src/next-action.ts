import { z } from 'zod'
import { LOGISTICS_CONTRACT_VERSION } from './version'

/**
 * The buyer-facing action the UI surfaces when a parcel needs something from the
 * buyer, rendered inline in the order view — never a separate wizard page.
 *
 * Open/additive: an unknown `type` degrades to a generic "action needed" prompt
 * rather than breaking the view. A NextAction may carry the CARRIER's contact so
 * the buyer can self-serve (e.g. reschedule a failed delivery) — carrier
 * identity is observable; it must never carry seller identity.
 */
export type KnownNextActionType =
  | 'contact_carrier_reschedule'
  | 'collect_before_window_closes'
  | 'provide_alternate_address'
  | 'awaiting_collection_code'
  | 'generic_action_required'

export type NextActionType = KnownNextActionType | (string & {})

export const KNOWN_NEXT_ACTION_TYPES: readonly KnownNextActionType[] = [
  'contact_carrier_reschedule',
  'collect_before_window_closes',
  'provide_alternate_address',
  'awaiting_collection_code',
  'generic_action_required',
] as const

export interface NextAction {
  version: typeof LOGISTICS_CONTRACT_VERSION
  type: NextActionType
  /** Human-readable instruction, safe to show the buyer as-is. */
  message: string
  /** Carrier contact for self-service. Carrier, never seller. */
  carrier_phone?: string
  carrier_url?: string
  /** When the action must be taken by, if the carrier gave a deadline. */
  deadline?: string | null
}

export const nextActionSchema = z.object({
  version: z.literal(LOGISTICS_CONTRACT_VERSION),
  type: z.string().min(1),
  message: z.string(),
  carrier_phone: z.string().optional(),
  carrier_url: z.string().optional(),
  deadline: z.string().nullable().optional(),
})
