# @mitumbadotafrica/logistics-contract

The wire contract for Mitumba Logistics: TypeScript types, zod schemas and the contract version.
It is the source of truth that `@mitumbadotafrica/logistics`, `-react` and `-native` build on. It
has no backend logic, no carrier code and no secrets.

```bash
npm install @mitumbadotafrica/logistics-contract
```

## What is in it

| Area | Types | Schemas |
|---|---|---|
| Markets | `Market`, `MarketsResponse`, `FulfilmentMethod` | `marketsResponseSchema` |
| Basket quotes (checkout) | `BasketQuoteRequest`, `BasketQuoteResponse`, `BasketQuote`, `BasketQuoteOption`, `PickupHub`, `DeliveryEta` | `basketQuoteRequestSchema`, `basketQuoteResponseSchema` |
| Seller delivery data | `StoreOrigin`, `StoreOriginInput`, `ListingPackage`, `PackageSize` | `storeOriginSchema`, `storeOriginInputSchema`, `listingPackageSchema` |
| Order quotes and parcels | `QuoteRequest`, `QuoteResponse`, `CreateParcelResponse`, `ParcelView` | `quoteResponseSchema`, `parcelViewSchema` |
| Tracking and next actions | `ParcelTracking`, `NextAction` | `parcelTrackingSchema`, `nextActionSchema` |
| Errors | `LogisticsErrorCode`, `BasketQuoteErrorCode`, `SellerDeliveryErrorCode` | `logisticsErrorBodySchema` |

## Rules the contract encodes

- **Method vs carrier.** The buyer picks a fulfilment method; the backend picks the carrier.
  `CarrierId` is open metadata to display, never to branch on.
- **Open enums.** Methods, carriers, unavailable reasons and statuses accept values this version
  does not know. Degrade safely; do not throw.
- **Unservable is not an error.** A basket the backend cannot deliver is `status: 'unavailable'`
  with a `reason`, inside a 200 response. It is never priced by default.

```ts
import { basketQuoteResponseSchema } from '@mitumbadotafrica/logistics-contract'

const quotes = basketQuoteResponseSchema.parse(await response.json())
```

MIT
