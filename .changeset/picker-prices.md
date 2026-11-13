---
'@mitumbadotafrica/logistics': minor
'@mitumbadotafrica/logistics-react': minor
'@mitumbadotafrica/logistics-native': minor
---

Prices read the way buyers write them. New `formatPrice(amount, locale?)` writes the currency code then the amount, with decimals only when it has any (`KES 260`, `KES 260.50`), using the currency's own decimals. Every picker and the delivery line use it by default and take a `formatMoney` prop for the host's own formatter; `BasketDeliveryPicker` (web and native) also takes `showCarrier` to hide the partner name. A method shows `from` only when its options differ in price. `etaLabel` reads `Within 1 day` for a 0-1 day window instead of `Same day`, which is kept for a same-day window.
