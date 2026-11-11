import { describe, expect, it } from 'vitest'
import {
  BASKET_QUOTE_ERROR_STATUS,
  PACKAGE_SIZES,
  basketQuoteRequestSchema,
  basketQuoteResponseSchema,
  listingPackageSchema,
  storeOriginInputSchema,
  storeOriginSchema,
} from './index'

// Shaped exactly as the engine answers POST /logistics/basket-quotes.
const response = {
  version: 1,
  market_code: 'KE',
  baskets: [
    {
      store_id: 'store-1',
      status: 'available',
      options: [
        {
          quote_id: 'dq_1',
          method: 'pickup_point',
          carrier: 'pickup_mtaani',
          carrier_name: 'Pickup Mtaani',
          price: { currency: 'KES', minor_units: 25_000 },
          expires_at: '2026-11-11T10:30:00.000Z',
          hub: { node_id: 'agent-1', name: 'Mtaani Kondele', address: 'Kondele Stage', latitude: -0.08, longitude: 34.77, opening_hours: '08:00-20:00' },
        },
        {
          quote_id: 'dq_2',
          method: 'same_day',
          carrier: 'uber_direct',
          carrier_name: 'Uber Direct',
          price: { currency: 'KES', minor_units: 52_000 },
          expires_at: '2026-11-11T10:30:00.000Z',
          eta: { min_days: 0, max_days: 1 },
        },
      ],
    },
    { store_id: 'store-2', status: 'unavailable', reason: 'outside_market', options: [] },
  ],
}

describe('basket quotes', () => {
  it('validates the engine response: hubs, ETAs and unavailable baskets', () => {
    expect(basketQuoteResponseSchema.parse(response)).toEqual(response)
  })

  it('tolerates an unavailable reason and a method it does not know', () => {
    const future = {
      ...response,
      baskets: [
        { store_id: 's', status: 'unavailable', reason: 'carrier_strike', options: [] },
        { ...response.baskets[0], options: [{ ...response.baskets[0]!.options[1], method: 'locker' }] },
      ],
    }
    expect(basketQuoteResponseSchema.safeParse(future).success).toBe(true)
  })

  it('rejects a hub without a position', () => {
    const broken = structuredClone(response)
    delete (broken.baskets[0]!.options[0]!.hub as Record<string, unknown>).latitude
    expect(basketQuoteResponseSchema.safeParse(broken).success).toBe(false)
  })

  it('accepts an address or a point destination', () => {
    const baskets = [{ store_id: 'store-1', items: [{ listing_id: 'l1', quantity: 2 }] }]
    expect(basketQuoteRequestSchema.safeParse({ market_code: 'KE', destination: { type: 'address', address_id: 'addr-1' }, baskets }).success).toBe(true)
    expect(basketQuoteRequestSchema.safeParse({ market_code: 'KE', destination: { type: 'point', latitude: -1.2, longitude: 36.8, region: 'Nairobi' }, baskets }).success).toBe(true)
    expect(basketQuoteRequestSchema.safeParse({ market_code: 'KE', destination: { type: 'point', latitude: 91, longitude: 0 }, baskets }).success).toBe(false)
    expect(basketQuoteRequestSchema.safeParse({ market_code: 'KE', destination: { type: 'address', address_id: 'a' }, baskets: [{ store_id: 's', items: [{ listing_id: 'l', quantity: 0 }] }] }).success).toBe(false)
  })

  it('documents the error statuses', () => {
    expect(BASKET_QUOTE_ERROR_STATUS).toMatchObject({ address_not_found: 404, market_not_supported: 422, market_not_active: 409 })
  })
})

describe('seller delivery data', () => {
  it('validates a store origin, and requires both coordinates or neither on input', () => {
    const origin = { store_id: 'store-1', latitude: -1.29, longitude: 36.78, address_line: 'Yaya Centre', dropoff_node_id: null, updated_at: '2026-11-11T00:00:00.000Z' }
    expect(storeOriginSchema.parse(origin)).toEqual(origin)
    expect(storeOriginInputSchema.safeParse({ latitude: -1.29, longitude: 36.78, address_line: null, dropoff_node_id: null }).success).toBe(true)
    expect(storeOriginInputSchema.safeParse({ latitude: -1.29, longitude: null, address_line: null, dropoff_node_id: null }).success).toBe(false)
  })

  it('validates a listing package size and its source', () => {
    expect(PACKAGE_SIZES).toEqual(['small', 'medium', 'large', 'oversize'])
    expect(listingPackageSchema.safeParse({ listing_id: 'l1', package_size: 'medium', source: 'category_default' }).success).toBe(true)
    expect(listingPackageSchema.safeParse({ listing_id: 'l1', package_size: 'huge', source: 'seller' }).success).toBe(false)
  })
})
