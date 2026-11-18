---
'@mitumbadotafrica/logistics-contract': minor
'@mitumbadotafrica/logistics': minor
---

Order parcel handover.

- Contract: `OrderParcelView` (`ShopOrderParcelView` with `handover`, `BuyerOrderParcelView`), `isShopParcelView`, `DeliverForMeOffer`, `MarkParcelReadyInput`, `RecordCounterHandoverInput`, and their zod schemas.
- Client: `getOrderParcel`, `getDeliverForMeOffer`, `markParcelReady`, `recordCounterHandover`, `confirmParcelReceived`.
- `LogisticsError.body` keeps the whole error body; `feeChangedOf(error)` reads the new fee from a `fee_changed` refusal.
