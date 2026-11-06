import { describe, it, expect } from 'vitest'
import { formatMoney } from './formatMoney'

describe('formatMoney', () => {
  it('formats a known currency from minor units', () => {
    const out = formatMoney({ currency: 'KES', minor_units: 35_000 })
    // Locale-dependent symbol/placement, but it must contain the major amount.
    expect(out).toMatch(/350/)
  })

  it('falls back to "<CODE> <amount>" for a structurally-invalid currency code', () => {
    // A non-3-letter code makes Intl throw a RangeError; the fallback catches it.
    expect(formatMoney({ currency: 'XX', minor_units: 12_345 })).toBe('XX 123.45')
  })

  it('formats zero via the fallback for an invalid code', () => {
    expect(formatMoney({ currency: 'XX', minor_units: 0 })).toBe('XX 0.00')
  })
})
