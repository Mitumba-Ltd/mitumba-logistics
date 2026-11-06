/**
 * The wire-contract version carried by every Mitumba Logistics response body as
 * the `version` field. Clients key response-model compatibility off this value,
 * not off the URL (the HTTP API is currently unversioned at the path level).
 *
 * Bump only on a breaking change to the response shape.
 */
export const LOGISTICS_CONTRACT_VERSION = 1 as const

export type LogisticsContractVersion = typeof LOGISTICS_CONTRACT_VERSION
