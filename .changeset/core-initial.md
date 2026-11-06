---
'@mitumba/logistics': minor
---

Initial release of the headless, carrier-neutral logistics client:
MitumbaLogistics (markets, quote, createParcel, getParcel), a framework-agnostic
retrying HTTP transport, the typed LogisticsError, and pollParcel (terminal- and
action-aware, treats unknown statuses as non-terminal). Zero UI, zero carrier
implementations, zero secrets.
