# @mitumbadotafrica/logistics-contract

## 0.3.0

### Minor Changes

- 2e4ebe5: Order parcel handover.

  - Contract: `OrderParcelView` (`ShopOrderParcelView` with `handover`, `BuyerOrderParcelView`), `isShopParcelView`, `DeliverForMeOffer`, `MarkParcelReadyInput`, `RecordCounterHandoverInput`, and their zod schemas.
  - Client: `getOrderParcel`, `getDeliverForMeOffer`, `markParcelReady`, `recordCounterHandover`, `confirmParcelReceived`.
  - `LogisticsError.body` keeps the whole error body; `feeChangedOf(error)` reads the new fee from a `fee_changed` refusal.

## 0.2.0

### Minor Changes

- 19afcdd: Basket quotes for checkout: price each shop basket before any order exists, with one option per door method and one per nearby pickup hub.

  - Contract: `BasketQuoteRequest`, `BasketQuoteResponse`, `BasketQuote`, `BasketQuoteOption` (with `hub` and `eta`), `PickupHub`, plus seller `StoreOrigin` and `ListingPackage`, and their error codes.
  - Core: `quoteBaskets`, `getStoreOrigin`/`setStoreOrigin`, `getListingPackage`/`setListingPackage`, and the helpers `methodChoices`, `checkoutDeliveries`, `methodLabel`, `unavailableLabel`, `etaLabel` and `isQuoteExpired`.
  - React and native: `useBasketQuotes`, `BasketDeliveryPicker` and `PickupHubPicker`.
  - Per-package READMEs.

## 0.1.0

### Minor Changes

- 7af7068: Initial release of the Mitumba Logistics wire contract: carrier-neutral types and
  zod schemas for market discovery, quoting, parcel creation, parcel status with
  dual-surface tracking, and the buyer-facing next-action. Carrier ids and
  fulfilment methods are open/additive metadata; the contract carries zero backend
  logic and zero carrier implementations.
