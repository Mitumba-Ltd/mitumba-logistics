import { describe, it, expect } from 'vitest'
import {
  LOGISTICS_CONTRACT_VERSION,
  moneySchema,
  marketsResponseSchema,
  fulfilmentMethodSchema,
  carrierIdSchema,
  quoteResponseSchema,
  parcelViewSchema,
  nextActionSchema,
  parcelTrackingSchema,
  isTerminalParcelStatus,
  KNOWN_FULFILMENT_METHODS,
  KNOWN_CARRIERS,
} from './index'

describe('contract version', () => {
  it('is 1', () => {
    expect(LOGISTICS_CONTRACT_VERSION).toBe(1)
  })
})

describe('money', () => {
  it('accepts a valid amount', () => {
    expect(moneySchema.parse({ currency: 'KES', minor_units: 35_000 })).toEqual({
      currency: 'KES',
      minor_units: 35_000,
    })
  })
  it('rejects a lowercase currency, a negative or fractional amount', () => {
    expect(moneySchema.safeParse({ currency: 'kes', minor_units: 1 }).success).toBe(false)
    expect(moneySchema.safeParse({ currency: 'KES', minor_units: -1 }).success).toBe(false)
    expect(moneySchema.safeParse({ currency: 'KES', minor_units: 1.5 }).success).toBe(false)
  })
})

describe('open enums are additive', () => {
  it('accepts a known and an unknown fulfilment method', () => {
    expect(fulfilmentMethodSchema.parse('pickup_point')).toBe('pickup_point')
    expect(fulfilmentMethodSchema.parse('locker')).toBe('locker')
    expect(KNOWN_FULFILMENT_METHODS).toContain('doorstep')
  })
  it('accepts a known and an unknown carrier id', () => {
    expect(carrierIdSchema.parse('pickup_mtaani')).toBe('pickup_mtaani')
    expect(carrierIdSchema.parse('future_carrier')).toBe('future_carrier')
    expect(KNOWN_CARRIERS).toContain('uber_direct')
  })
})

describe('isTerminalParcelStatus', () => {
  it('treats delivered/returned/cancelled/lost as terminal', () => {
    expect(isTerminalParcelStatus('delivered')).toBe(true)
    expect(isTerminalParcelStatus('lost')).toBe(true)
  })
  it('treats in-flight and unknown statuses as non-terminal', () => {
    expect(isTerminalParcelStatus('in_transit')).toBe(false)
    expect(isTerminalParcelStatus('action_required')).toBe(false)
    expect(isTerminalParcelStatus('some_future_status')).toBe(false)
  })
})

describe('markets response', () => {
  it('round-trips a KE market', () => {
    const body = {
      version: 1,
      markets: [
        {
          code: 'KE',
          name: 'Kenya',
          status: 'active',
          currency: { code: 'KES', minor_unit: 2, symbol: 'KSh', locale: 'en-KE' },
          calling_code: '+254',
          supported_methods: ['pickup_point', 'doorstep'],
        },
      ],
      updated_at: '2026-11-06T00:00:00.000Z',
    }
    expect(marketsResponseSchema.parse(body)).toEqual(body)
  })
})

describe('quote response', () => {
  it('validates a chosen option with carrier metadata and price', () => {
    const body = {
      version: 1,
      chosen: {
        quote_id: 'sq_1',
        carrier: 'pickup_mtaani',
        carrier_name: 'Pickup Mtaani',
        method: 'pickup_point',
        price: { currency: 'KES', minor_units: 35_000 },
        binding: false,
        expires_at: null,
      },
      alternatives: [],
    }
    expect(quoteResponseSchema.parse(body)).toEqual(body)
  })
})

describe('parcel view + tracking + next action', () => {
  it('validates the dual-surface tracking passthrough', () => {
    const tracking = {
      carrier: 'pickup_mtaani',
      carrier_name: 'Pickup Mtaani',
      tracking_number: 'TRK1',
      tracking_url: null,
      tracking_website: 'https://new.pickupmtaani.com/track',
    }
    expect(parcelTrackingSchema.parse(tracking)).toEqual(tracking)
  })

  it('validates a parcel view with an action and a reschedule next action', () => {
    const view = {
      version: 1,
      parcel_id: 'pcl_1',
      status: 'action_required',
      tracking: {
        carrier: 'pickup_mtaani',
        carrier_name: 'Pickup Mtaani',
        tracking_number: 'TRK1',
        tracking_url: null,
        tracking_website: null,
      },
      next_action_type: 'contact_carrier_reschedule',
      has_collection_code: true,
      updated_at: '2026-11-06T00:00:00.000Z',
    }
    expect(parcelViewSchema.parse(view)).toEqual(view)

    const action = {
      version: 1,
      type: 'contact_carrier_reschedule',
      message: 'The courier could not reach you.',
      carrier_phone: '+254700000000',
      deadline: null,
    }
    expect(nextActionSchema.parse(action)).toEqual(action)
  })
})
