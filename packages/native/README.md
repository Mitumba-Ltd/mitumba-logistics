# @mitumbadotafrica/logistics-native

React Native views for Mitumba Logistics: the checkout delivery step, the inline delivery-price
line, and parcel tracking. No WebView. The views are unstyled; style them through the `style`,
`textStyle` and `selectedStyle` props. Re-exports `@mitumbadotafrica/logistics`.

```bash
npm install @mitumbadotafrica/logistics-native react react-native
```

## Checkout delivery step

```tsx
import { BasketDeliveryPicker, checkoutDeliveries, useBasketQuotes } from '@mitumbadotafrica/logistics-native'

const { loading, baskets, error, refresh } = useBasketQuotes({ token, request })

baskets.map((basket) => (
  <BasketDeliveryPicker
    key={basket.store_id}
    basket={basket}
    legend={shopName(basket.store_id)}
    value={picks[basket.store_id] ?? null}
    onChange={(quoteId) => setPicks({ ...picks, [basket.store_id]: quoteId })}
    selectedStyle={styles.selected}
  />
))

const ready = checkoutDeliveries(baskets, picks) // { ok: true, deliveries } once every shop is picked
```

- Each choice is a `Pressable` with `accessibilityRole="radio"` and its checked state, inside a
  `radiogroup`, so screen readers announce the options correctly.
- Choosing a pickup method picks its cheapest hub and lists the others in `PickupHubPicker`.
- `renderHub(option, selected)` customises each hub row.
- An unavailable basket shows its reason and no controls.

## Other views

- `DeliveryQuoteLine` / `useDeliveryQuote` for an existing order's delivery price.
- `ParcelTrackingView` / `useParcelTracking`. Carrier tracking links open with `Linking`.

MIT
