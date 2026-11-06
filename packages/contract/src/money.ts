import { z } from 'zod'

/**
 * A carrier-neutral, market-neutral monetary amount. The same shape Mitumba Pay
 * uses, so the two SDKs speak one money vocabulary.
 *
 * `minor_units` is the amount in the currency's smallest indivisible unit
 * (e.g. KES 250.00 === 25000 cents). It is always a nonnegative safe integer:
 * response validation rejects negative, fractional, or overflowing amounts so a
 * malformed backend amount can never be interpreted as a payable total.
 */
export interface Money {
  /** ISO 4217 currency code, e.g. "KES". Open string — not a closed enum. */
  currency: string
  /** Amount in minor units. Nonnegative `Number.isSafeInteger`. */
  minor_units: number
}

/**
 * ISO 4217 is three uppercase letters. Validated by format, not by a closed
 * list, so a new market's currency parses without an SDK release.
 */
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'currency must be an ISO 4217 alpha-3 code')

/**
 * Minor-unit amounts must be nonnegative safe integers. The explicit
 * `Number.isSafeInteger` refinement rejects overflow that would silently lose
 * precision.
 */
export const minorUnitsSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, 'minor_units must be a safe integer')

export const moneySchema = z.object({
  currency: currencyCodeSchema,
  minor_units: minorUnitsSchema,
}) satisfies z.ZodType<Money>
