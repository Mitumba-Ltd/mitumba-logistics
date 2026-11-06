/**
 * Format a Money as a localised currency string, falling back to a plain
 * "<CODE> <amount>" form for a currency code Intl does not recognise (markets
 * and currencies are open by contract, so an unknown code must not throw).
 */
export function formatMoney(amount: { currency: string; minor_units: number }): string {
  const major = amount.minor_units / 100
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: amount.currency }).format(major)
  } catch {
    return `${amount.currency} ${major.toFixed(2)}`
  }
}
