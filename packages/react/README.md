# @mitumbadotafrica/logistics-react

Embedded React views for Mitumba Logistics: the checkout delivery step, the inline delivery-price
line, and parcel tracking. Views are unstyled (structure, text and native form controls with
`mitumba-*` class names), so your app themes them. Re-exports `@mitumbadotafrica/logistics`.

```bash
npm install @mitumbadotafrica/logistics-react react react-dom
```

## Checkout delivery step

```tsx
import { useState } from 'react'
import { BasketDeliveryPicker, checkoutDeliveries, useBasketQuotes } from '@mitumbadotafrica/logistics-react'

function DeliveryStep({ request, onReady }) {
  const { loading, baskets, error, refresh } = useBasketQuotes({ token, request })
  const [picks, setPicks] = useState<Record<string, string>>({})

  if (loading) return <Skeleton />
  if (error) return <Retry onRetry={refresh} />

  const ready = checkoutDeliveries(baskets, picks)
  return (
    <>
      {baskets.map((basket) => (
        <BasketDeliveryPicker
          key={basket.store_id}
          basket={basket}
          legend={shopName(basket.store_id)}
          value={picks[basket.store_id] ?? null}
          onChange={(quoteId) => setPicks({ ...picks, [basket.store_id]: quoteId })}
        />
      ))}
      <button disabled={!ready.ok} onClick={() => ready.ok && onReady(ready.deliveries)}>Continue</button>
    </>
  )
}
```

- `BasketDeliveryPicker` offers each method once with its starting price, ETA and carrier.
  Choosing a pickup method picks its cheapest hub and opens `PickupHubPicker`, where the buyer can
  choose another. An unavailable basket shows its reason and no controls.
- Props: `methodLabels`, `unavailableLabels` and `renderHub` (for example, a map pin or distance).
- `PickupHubPicker` can also be used on its own.

## Other views

- `DeliveryQuoteLine` / `useDeliveryQuote`: "Delivery: KES X via <carrier>" for an existing order.
- `ParcelTrackingView` / `useParcelTracking`: Mitumba's status first, then the carrier's own
  tracking link or code, and the next action while a parcel is `action_required`.

MIT
