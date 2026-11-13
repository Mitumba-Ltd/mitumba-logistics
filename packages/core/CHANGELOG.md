# @mitumbadotafrica/logistics

## 0.3.0

### Minor Changes

- 49f5993: Prices read the way buyers write them. New `formatPrice(amount, locale?)` writes the currency code then the amount, with decimals only when it has any (`KES 260`, `KES 260.50`), using the currency's own decimals. Every picker and the delivery line use it by default and take a `formatMoney` prop for the host's own formatter; `BasketDeliveryPicker` (web and native) also takes `showCarrier` to hide the partner name. A method shows `from` only when its options differ in price. `etaLabel` reads `Within 1 day` for a 0-1 day window instead of `Same day`, which is kept for a same-day window.

## 0.2.1

### Patch Changes

- b61e03e: Call the default `fetch` on the global object. The client stored `globalThis.fetch` and called it as a method of itself, which browsers and Workers reject with `TypeError: Illegal invocation`, so every request without a custom `fetch` failed as a network error.

## 0.2.0

### Minor Changes

- 19afcdd: Basket quotes for checkout: price each shop basket before any order exists, with one option per door method and one per nearby pickup hub.

  - Contract: `BasketQuoteRequest`, `BasketQuoteResponse`, `BasketQuote`, `BasketQuoteOption` (with `hub` and `eta`), `PickupHub`, plus seller `StoreOrigin` and `ListingPackage`, and their error codes.
  - Core: `quoteBaskets`, `getStoreOrigin`/`setStoreOrigin`, `getListingPackage`/`setListingPackage`, and the helpers `methodChoices`, `checkoutDeliveries`, `methodLabel`, `unavailableLabel`, `etaLabel` and `isQuoteExpired`.
  - React and native: `useBasketQuotes`, `BasketDeliveryPicker` and `PickupHubPicker`.
  - Per-package READMEs.

### Patch Changes

- Updated dependencies [19afcdd]
  - @mitumbadotafrica/logistics-contract@0.2.0

## 0.1.0

### Minor Changes

- b20b298: Initial release of the headless, carrier-neutral logistics client:
  MitumbaLogistics (markets, quote, createParcel, getParcel), a framework-agnostic
  retrying HTTP transport, the typed LogisticsError, and pollParcel (terminal- and
  action-aware, treats unknown statuses as non-terminal). Zero UI, zero carrier
  implementations, zero secrets.

### Patch Changes

- Updated dependencies [7af7068]
  - @mitumbadotafrica/logistics-contract@0.1.0
