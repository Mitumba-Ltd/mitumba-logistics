# @mitumbadotafrica/logistics-native

## 0.2.1

### Patch Changes

- Updated dependencies [b61e03e]
  - @mitumbadotafrica/logistics@0.2.1

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

- 9b5fdce: Initial release of the embedded React Native views: the useDeliveryQuote and
  useParcelTracking hooks and the DeliveryQuoteLine and ParcelTrackingView
  components, rendered with native primitives (no WebView). Inline delivery-quote
  and parcel-tracking UI with the dual-surface carrier tracking passthrough
  (tappable via Linking) and the action_required NextAction prompt. Unstyled and
  host-styleable; zero carrier logic.

### Patch Changes

- Updated dependencies [b20b298]
  - @mitumbadotafrica/logistics@0.1.0
