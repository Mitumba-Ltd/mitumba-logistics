/**
 * @mitumbadotafrica/logistics-native — embedded React Native views over @mitumbadotafrica/logistics.
 *
 * Inline delivery-quote and parcel-tracking UI for product, cart, checkout, and
 * order screens (the embedded model, not a wizard). No WebView, no carrier
 * implementations, no secrets, no routing logic — the backend owns all of that.
 */
export { useDeliveryQuote, useParcelTracking } from './hooks'
export type {
  UseDeliveryQuoteOptions,
  UseDeliveryQuoteState,
  UseParcelTrackingOptions,
  UseParcelTrackingState,
} from './hooks'
export { DeliveryQuoteLine, ParcelTrackingView } from './components'
export type { DeliveryQuoteLineProps, ParcelTrackingViewProps } from './components'

// Re-export the client + contract so consumers need a single import.
export * from '@mitumbadotafrica/logistics'
