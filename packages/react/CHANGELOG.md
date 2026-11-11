# @mitumbadotafrica/logistics-react

## 0.2.0

### Minor Changes

- 19afcdd: Basket quotes for checkout: price each shop basket before any order exists, with one option per door method and one per nearby pickup hub.

  - Contract: `BasketQuoteRequest`, `BasketQuoteResponse`, `BasketQuote`, `BasketQuoteOption` (with `hub` and `eta`), `PickupHub`, plus seller `StoreOrigin` and `ListingPackage`, and their error codes.
  - Core: `quoteBaskets`, `getStoreOrigin`/`setStoreOrigin`, `getListingPackage`/`setListingPackage`, and the helpers `methodChoices`, `checkoutDeliveries`, `methodLabel`, `unavailableLabel`, `etaLabel` and `isQuoteExpired`.
  - React and native: `useBasketQuotes`, `BasketDeliveryPicker` and `PickupHubPicker`.
  - Per-package READMEs.

### Patch Changes

- Updated dependencies [19afcdd]
  - @mitumbadotafrica/logistics@0.2.0

## 0.1.0

### Minor Changes

- 65a587e: Initial release of the embedded React views: the useDeliveryQuote and
  useParcelTracking hooks and the DeliveryQuoteLine and ParcelTrackingView
  components — inline delivery-quote and parcel-tracking UI for product, cart,
  checkout, and order surfaces, with the dual-surface carrier tracking passthrough
  and the action_required NextAction prompt. Unstyled and host-themeable; zero
  carrier logic.

### Patch Changes

- Updated dependencies [b20b298]
  - @mitumbadotafrica/logistics@0.1.0
