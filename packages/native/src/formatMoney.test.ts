import { describe, it, expect } from 'vitest'
import { formatMoney } from './formatMoney'

describe('formatMoney', () => {
  it('formats a known currency from minor units', () => {
    expect(formatMoney({ currency: 'KES', minor_units: 35_000 })).toBe('KES 350')
    expect(formatMoney({ currency: 'KES', minor_units: 35_050 })).toBe('KES 350.50')
  })

  it('falls back to "<CODE> <amount>" for a structurally-invalid currency code', () => {
    // A non-3-letter code makes Intl throw a RangeError; the fallback catches it.
    expect(formatMoney({ currency: 'XX', minor_units: 12_345 })).toBe('XX 123.45')
  })

  it('formats zero via the fallback for an invalid code', () => {
    expect(formatMoney({ currency: 'XX', minor_units: 0 })).toBe('XX 0')
  })
})
