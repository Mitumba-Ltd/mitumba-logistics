import type {
  BasketQuote,
  BasketQuoteOption,
  FulfilmentMethod,
  KnownFulfilmentMethod,
} from '@mitumbadotafrica/logistics-contract'

/**
 * Framework-free helpers for a checkout's delivery step, shared by the React and
 * React Native pickers. They only arrange what the backend returned: the client
 * never chooses a carrier, never prices, and never invents an option.
 */

/** The options of one method for a basket. A pickup method lists one option per hub. */
export interface MethodChoice {
  method: FulfilmentMethod
  options: BasketQuoteOption[]
  /** The cheapest option of the method, for a "from KES X" line. */
  cheapest: BasketQuoteOption
  /** True when the buyer picks a hub (the options carry `hub`). */
  needsHub: boolean
}

/** Group a basket's options by method, in the order the backend returned them. */
export function methodChoices(basket: BasketQuote): MethodChoice[] {
  const byMethod = new Map<FulfilmentMethod, BasketQuoteOption[]>()
  for (const option of basket.options) {
    const options = byMethod.get(option.method) ?? []
    options.push(option)
    byMethod.set(option.method, options)
  }
  return [...byMethod].map(([method, options]) => ({
    method,
    options,
    cheapest: options.reduce((best, option) => (option.price.minor_units < best.price.minor_units ? option : best)),
    needsHub: options.some((option) => option.hub !== undefined),
  }))
}

const METHOD_LABELS: Record<KnownFulfilmentMethod, string> = {
  pickup_point: 'Pickup point',
  doorstep: 'Door delivery',
  same_day: 'Same-day delivery',
  branch_collection: 'Branch collection',
}

/** Buyer-facing name for a method. An unknown method is humanised, never an error. */
export function methodLabel(method: FulfilmentMethod, overrides: Partial<Record<string, string>> = {}): string {
  return (
    overrides[method] ??
    METHOD_LABELS[method as KnownFulfilmentMethod] ??
    method.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  )
}

/** Buyer-facing copy for an unavailable basket. An unknown reason gets the generic line. */
export function unavailableLabel(reason: string | undefined, overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    no_carrier_for_lane: 'No delivery is available from this shop to your location yet.',
    outside_market: 'This shop does not deliver to that location.',
    listing_unavailable: 'An item from this shop is no longer available.',
  }
  const key = reason ?? ''
  return overrides[key] ?? defaults[key] ?? 'Delivery is unavailable for this shop.'
}

/** "Same day", "1 day", "2–4 days". */
export function etaLabel(eta: { min_days: number; max_days: number }): string {
  if (eta.max_days === 0) return 'Same day'
  if (eta.min_days === 0 && eta.max_days === 1) return 'Within 1 day'
  if (eta.min_days === eta.max_days) return `${eta.max_days} ${eta.max_days === 1 ? 'day' : 'days'}`
  return `${eta.min_days}–${eta.max_days} days`
}

/** Fraction digits a currency is written with (2 for KES, 0 for UGX); 2 when the runtime does not know it. */
function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

/**
 * A price as a buyer reads it: the currency code, then the amount with grouping, and decimals
 * only when it has any. `{ currency: 'KES', minor_units: 26_000 }` reads "KES 260";
 * `26_050` reads "KES 260.50". The code always leads, so a price never reads as another currency.
 */
export function formatPrice(amount: { currency: string; minor_units: number }, locale?: string): string {
  const digits = currencyDigits(amount.currency)
  const major = amount.minor_units / 10 ** digits
  const whole = Number.isInteger(major)
  const number = new Intl.NumberFormat(locale ?? 'en', {
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: whole ? 0 : digits,
  }).format(major)
  return `${amount.currency} ${number}`
}

/** Has an option's quote stopped being claimable? Re-quote before checkout if so. */
export function isQuoteExpired(option: Pick<BasketQuoteOption, 'expires_at'>, now: Date = new Date()): boolean {
  return Date.parse(option.expires_at) <= now.getTime()
}

/** One shop's pick, as checkout takes it: `deliveries: [{ store_id, quote_id }]`. */
export interface CheckoutDelivery {
  store_id: string
  quote_id: string
}

export type CheckoutDeliveriesResult =
  | { ok: true; deliveries: CheckoutDelivery[] }
  /** Shops the buyer has not picked a valid option for, and shops that cannot be delivered. */
  | { ok: false; missing: string[]; unavailable: string[] }

/**
 * Turn the buyer's picks (store id → quote id) into checkout's `deliveries`.
 * Every basket needs exactly one pick among its own options; an unavailable
 * basket blocks checkout (the shop's items must be removed or the destination
 * changed). A pick that is not one of the basket's options counts as missing.
 */
export function checkoutDeliveries(
  baskets: readonly BasketQuote[],
  picks: Readonly<Record<string, string | undefined>>,
): CheckoutDeliveriesResult {
  const missing: string[] = []
  const unavailable: string[] = []
  const deliveries: CheckoutDelivery[] = []
  for (const basket of baskets) {
    if (basket.status !== 'available' || basket.options.length === 0) {
      unavailable.push(basket.store_id)
      continue
    }
    const quoteId = picks[basket.store_id]
    if (!quoteId || !basket.options.some((option) => option.quote_id === quoteId)) {
      missing.push(basket.store_id)
      continue
    }
    deliveries.push({ store_id: basket.store_id, quote_id: quoteId })
  }
  return missing.length === 0 && unavailable.length === 0 ? { ok: true, deliveries } : { ok: false, missing, unavailable }
}
