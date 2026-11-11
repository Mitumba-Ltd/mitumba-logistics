# Mitumba Logistics

Asset-light carrier-orchestration SDK for Mitumba — the public client for the
logistics engine. The platform owns no trucks, riders, or agents; it orchestrates
third-party Kenyan carriers behind one neutral interface.

This repo is the **public client SDK**. The carrier-orchestration engine lives
privately in `Mitumba-Ltd/mitumba` under `workers/logistics/`. It is the
logistics sibling of [`mitumba-pay`](https://github.com/Mitumba-Ltd/mitumba-pay).

## The model

- **Method vs carrier.** The buyer chooses a *fulfilment method*
  (`pickup_point`, `doorstep`, `same_day`, `branch_collection`). The backend
  chooses the *carrier*. Carrier identity is observable metadata, never a client
  input that routes a shipment.
- **Mitumba is the masked sender.** Seller identity never reaches the carrier or
  the buyer. Carrier identity is observable and safe to show — it builds buyer
  trust and enables cross-carrier tracking.
- **Dual-surface tracking.** Mitumba's normalized status is authoritative; the
  carrier's own tracking number / link / site are passed through so the buyer
  can also track on the carrier's surface (the AliExpress model).
- **Unknown is not failure.** Methods, carriers, and next-actions are open and
  additive — the client tolerates values it does not know and degrades safely.

## Packages

| Package | npm | Description |
|---|---|---|
| `packages/contract` | `@mitumbadotafrica/logistics-contract` | Wire contract: types + zod schemas + version. Source of truth. [README](packages/contract/README.md) |
| `packages/core` | `@mitumbadotafrica/logistics` | Headless client: basket quotes, seller delivery data, parcels, polling. [README](packages/core/README.md) |
| `packages/react` | `@mitumbadotafrica/logistics-react` | Embedded web views: delivery and pickup-hub pickers, tracking. [README](packages/react/README.md) |
| `packages/native` | `@mitumbadotafrica/logistics-native` | React Native views: delivery and pickup-hub pickers, tracking. [README](packages/native/README.md) |

## Development

```bash
npm install
npm run build
npm run typecheck
npm run test
npm run lint
```

Releases use [Changesets](https://github.com/changesets/changesets) and npm OIDC
Trusted Publishing with provenance. There is no `NPM_TOKEN` in this repo.

## License

MIT
