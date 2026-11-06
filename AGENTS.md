# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## What this repo is

The **public client SDK** for Mitumba Logistics. The real carrier-orchestration
engine lives privately in `Mitumba-Ltd/mitumba` under `workers/logistics/`. This
repo talks to that engine's HTTP API. It is the logistics sibling of
`mitumba-pay`.

## Hard rules — do not violate

1. **No carrier implementations.** No Pickup Mtaani / Uber Direct / Fargo /
   Speedaf / bus-operator booking, tracking, or auth code, ever. The backend
   books and tracks carriers; the client picks only a *fulfilment method*.
2. **No credentials or secrets.** No carrier API keys, OAuth client secrets,
   webhook signing secrets, or customer ids.
3. **No routing rules.** No "if Nairobi use X carrier" logic. Carrier selection
   is backend-owned.
4. **Carrier ids are open metadata.** `CarrierId = KnownCarrier | (string & {})`.
   Never write an exhaustive carrier `switch` to drive the flow — follow
   `next_action` and the carrier capabilities the session surfaces.
5. **Method vs carrier.** The buyer chooses a *method* (pickup_point, doorstep,
   same_day, branch_collection). The backend chooses the *carrier*. Carrier
   identity is observable metadata shown to the buyer (safe — it is the carrier,
   never the seller), never a client branch.
6. **The collection code is buyer-only and sensitive.** Never log it, never
   render it to anyone but the buyer, never persist it beyond the buyer's view.
7. **If a task needs to know HOW a parcel is booked or routed, stop.** Raise it;
   the backend's public API separation is the problem to fix, not something to
   work around here.

## Structure

- `packages/contract` → `@mitumba/logistics-contract` — types + zod + version
  (source of truth)
- `packages/core` → `@mitumba/logistics` — headless client + state machine +
  polling (planned)
- `packages/react` → `@mitumba/logistics-react` — embedded web views (planned)
- `packages/native` → `@mitumba/logistics-native` — RN views (planned)
- `apps/*` — private, unpublished

## Workflow

- Update the contract package first, then consumers.
- `npm run build && npm run typecheck && npm run test && npm run lint` before
  proposing done.
- Add a Changeset for any published-package change.
- Never add or store an `NPM_TOKEN`. Releases use npm OIDC Trusted Publishing +
  provenance.
