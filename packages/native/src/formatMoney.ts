import { formatPrice } from '@mitumbadotafrica/logistics'

/**
 * Format a Money the way the pickers write prices: the currency code, then the amount, with decimals
 * only when it has any ("KES 260", "KES 260.50"). An unknown currency code never throws.
 */
export function formatMoney(amount: { currency: string; minor_units: number }): string {
  return formatPrice(amount)
}
