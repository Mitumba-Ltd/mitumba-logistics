---
'@mitumbadotafrica/logistics-contract': minor
'@mitumbadotafrica/logistics': minor
'@mitumbadotafrica/logistics-react': minor
'@mitumbadotafrica/logistics-native': minor
---

Basket quotes for checkout: price each shop basket before any order exists, with one option per door method and one per nearby pickup hub.

- Contract: `BasketQuoteRequest`, `BasketQuoteResponse`, `BasketQuote`, `BasketQuoteOption` (with `hub` and `eta`), `PickupHub`, plus seller `StoreOrigin` and `ListingPackage`, and their error codes.
- Core: `quoteBaskets`, `getStoreOrigin`/`setStoreOrigin`, `getListingPackage`/`setListingPackage`, and the helpers `methodChoices`, `checkoutDeliveries`, `methodLabel`, `unavailableLabel`, `etaLabel` and `isQuoteExpired`.
- React and native: `useBasketQuotes`, `BasketDeliveryPicker` and `PickupHubPicker`.
- Per-package READMEs.
