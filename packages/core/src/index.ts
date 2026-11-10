/**
 * @mitumbadotafrica/logistics — headless, carrier-neutral logistics client.
 *
 * Knows the shape of requests/responses (via @mitumbadotafrica/logistics-contract) and
 * nothing about how parcels are booked, routed, or tracked. No carrier
 * implementations, no secrets.
 */
export { MitumbaLogistics } from './client'
export type { CreateParcelInput, ShipmentPartyInput } from './client'
export { HttpClient } from './http'
export { LogisticsError } from './errors'
export { DEFAULT_BASE_URL } from './config'
export type { MitumbaLogisticsConfig, RequestOptions } from './config'
export { pollParcel } from './polling'
export type { PollParcelOptions } from './polling'

// Re-export the wire contract for convenience so consumers need one import.
export * from '@mitumbadotafrica/logistics-contract'
