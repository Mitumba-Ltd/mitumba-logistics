# @mitumbadotafrica/logistics

The headless, carrier-neutral client for Mitumba Logistics. It speaks the HTTP contract and
nothing else: no carrier code, no routing rules, no secrets. Re-exports
`@mitumbadotafrica/logistics-contract`, so one import is enough.

```bash
npm install @mitumbadotafrica/logistics
```

```ts
import { MitumbaLogistics } from '@mitumbadotafrica/logistics'

const logistics = new MitumbaLogistics({ token: () => session.accessToken })
```

`token` is a string or a function returning one (sync or async). `baseUrl`, `fetch`, `maxRetries`
and `debug` are optional. A non-2xx response throws a `LogisticsError` with `status`, `code` and,
where the backend gives one, `reason`.

## Checkout delivery: basket quotes

Price each shop's basket before any order exists. The backend derives the origin from the shop.
You send the destination: a saved address, or a "Deliver to" point with its region.

```ts
const { baskets } = await logistics.quoteBaskets({
  market_code: 'KE',
  destination: { type: 'address', address_id },
  baskets: [{ store_id, items: [{ listing_id, quantity: 2 }] }],
})
```

Each basket is `available` with options, or `unavailable` with a `reason`. An available basket
has one option per door method and one per nearby pickup hub (`option.hub`). The helpers below
arrange what came back. They never choose a carrier or invent a price:

| Helper | Use |
|---|---|
| `methodChoices(basket)` | Options grouped by method, with the cheapest and whether a hub is picked |
| `methodLabel(method)`, `unavailableLabel(reason)`, `etaLabel(eta)` | Buyer-facing copy, overridable, safe for unknown values |
| `isQuoteExpired(option)` | Re-quote once `expires_at` has passed |
| `checkoutDeliveries(baskets, picks)` | The `deliveries: [{ store_id, quote_id }]` checkout takes, or which shops are missing or undeliverable |

A quote is bound to the buyer, shop, market, destination and the basket's exact items. Re-quote
after any of them changes.

## Seller delivery data

```ts
await logistics.setStoreOrigin(storeId, { latitude, longitude, address_line, dropoff_node_id: null })
await logistics.setListingPackage(listingId, 'medium')   // small | medium | large | oversize
```

`getStoreOrigin` and `getListingPackage` read them back. A listing without a size reports its
category default (`source: 'category_default'`).

## Orders and parcels

`getMarkets()`, `quote()` (an existing order), `createParcel()`, `getParcel()`, and
`pollParcel(client, parcelId, options)`. `pollParcel` stops at a terminal status, or at
`action_required` so you can surface the next action.

MIT
