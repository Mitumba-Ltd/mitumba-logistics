/**
 * @mitumbadotafrica/logistics-react — embedded React views over @mitumbadotafrica/logistics.
 *
 * Inline delivery-quote, method, and parcel-tracking UI for product, cart,
 * checkout, and order surfaces (the embedded model, not a wizard). No carrier
 * implementations, no secrets, no routing logic — the backend owns all of that.
 */
export { useDeliveryQuote } from './useDeliveryQuote'
export type { UseDeliveryQuoteOptions, UseDeliveryQuoteState } from './useDeliveryQuote'
export { useParcelTracking } from './useParcelTracking'
export type { UseParcelTrackingOptions, UseParcelTrackingState } from './useParcelTracking'
export { DeliveryQuoteLine, ParcelTrackingView } from './components'
export type { DeliveryQuoteLineProps, ParcelTrackingViewProps } from './components'

// Re-export the client + contract so consumers need a single import.
export * from '@mitumbadotafrica/logistics'
