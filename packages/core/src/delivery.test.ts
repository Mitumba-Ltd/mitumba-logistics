import { describe, expect, it, vi } from 'vitest'
import type { BasketQuote, BasketQuoteOption } from '@mitumbadotafrica/logistics-contract'
import { MitumbaLogistics } from './client'
import {
  checkoutDeliveries,
  etaLabel,
  formatPrice,
  isQuoteExpired,
  methodChoices,
  methodLabel,
  unavailableLabel,
} from './delivery'

const option = (overrides: Partial<BasketQuoteOption>): BasketQuoteOption => ({
  quote_id: 'dq',
  method: 'doorstep',
  carrier: 'pickup_mtaani',
  carrier_name: 'Pickup Mtaani',
  price: { currency: 'KES', minor_units: 43_000 },
  expires_at: '2026-11-11T10:30:00.000Z',
  ...overrides,
})
const hub = (id: string) => ({ node_id: id, name: `Hub ${id}`, address: 'Street', latitude: -0.1, longitude: 34.7 })

const basket: BasketQuote = {
  store_id: 'store-1',
  status: 'available',
  options: [
    option({ quote_id: 'dq_h1', method: 'pickup_point', price: { currency: 'KES', minor_units: 27_000 }, hub: hub('h1') }),
    option({ quote_id: 'dq_h2', method: 'pickup_point', price: { currency: 'KES', minor_units: 25_000 }, hub: hub('h2') }),
    option({ quote_id: 'dq_door' }),
  ],
}

describe('methodChoices', () => {
  it('groups options by method in backend order, with the cheapest and whether a hub is picked', () => {
    const choices = methodChoices(basket)
    expect(choices.map((c) => [c.method, c.options.length, c.cheapest.quote_id, c.needsHub])).toEqual([
      ['pickup_point', 2, 'dq_h2', true],
      ['doorstep', 1, 'dq_door', false],
    ])
  })

  it('has no choices for an unavailable basket', () => {
    expect(methodChoices({ store_id: 's', status: 'unavailable', reason: 'outside_market', options: [] })).toEqual([])
  })
})

describe('labels', () => {
  it('names known methods, humanises unknown ones, and takes overrides', () => {
    expect(methodLabel('doorstep')).toBe('Door delivery')
    expect(methodLabel('same_day')).toBe('Same-day delivery')
    expect(methodLabel('smart_locker')).toBe('Smart locker')
    expect(methodLabel('doorstep', { doorstep: 'To your door' })).toBe('To your door')
  })

  it('explains each unavailable reason, and falls back for an unknown one', () => {
    expect(unavailableLabel('outside_market')).toMatch(/does not deliver/)
    expect(unavailableLabel('listing_unavailable')).toMatch(/no longer available/)
    expect(unavailableLabel('no_carrier_for_lane')).toMatch(/No delivery/)
    expect(unavailableLabel('carrier_strike')).toBe('Delivery is unavailable for this shop.')
    expect(unavailableLabel(undefined)).toBe('Delivery is unavailable for this shop.')
    expect(unavailableLabel('outside_market', { outside_market: 'Not here' })).toBe('Not here')
  })

  it('formats ETAs', () => {
    expect(etaLabel({ min_days: 0, max_days: 1 })).toBe('Within 1 day')
    expect(etaLabel({ min_days: 0, max_days: 0 })).toBe('Same day')
    expect(etaLabel({ min_days: 1, max_days: 1 })).toBe('1 day')
    expect(etaLabel({ min_days: 3, max_days: 3 })).toBe('3 days')
    expect(etaLabel({ min_days: 2, max_days: 4 })).toBe('2–4 days')
  })
})

describe('formatPrice', () => {
  it('writes whole amounts without decimals, and decimals only when there are any', () => {
    expect(formatPrice({ currency: 'KES', minor_units: 26_000 })).toBe('KES 260')
    expect(formatPrice({ currency: 'KES', minor_units: 26_050 })).toBe('KES 260.50')
    expect(formatPrice({ currency: 'KES', minor_units: 130_000 })).toBe('KES 1,300')
    expect(formatPrice({ currency: 'KES', minor_units: 0 })).toBe('KES 0')
  })

  it("uses the currency's own decimals, and two for a code the runtime does not know", () => {
    expect(formatPrice({ currency: 'UGX', minor_units: 5_000 })).toBe('UGX 5,000')
    expect(formatPrice({ currency: 'ZZZ', minor_units: 1_234 })).toBe('ZZZ 12.34')
  })

  it('groups digits for the locale given', () => {
    expect(formatPrice({ currency: 'KES', minor_units: 12_345_600 }, 'de-DE')).toBe('KES 123.456')
  })
})

describe('isQuoteExpired', () => {
  it('compares expires_at with now', () => {
    expect(isQuoteExpired(option({}), new Date('2026-11-11T10:29:59.000Z'))).toBe(false)
    expect(isQuoteExpired(option({}), new Date('2026-11-11T10:30:00.000Z'))).toBe(true)
  })
})

describe('checkoutDeliveries', () => {
  const other: BasketQuote = { store_id: 'store-2', status: 'available', options: [option({ quote_id: 'dq_other' })] }

  it("turns one valid pick per shop into checkout's deliveries", () => {
    expect(checkoutDeliveries([basket, other], { 'store-1': 'dq_h2', 'store-2': 'dq_other' })).toEqual({
      ok: true,
      deliveries: [{ store_id: 'store-1', quote_id: 'dq_h2' }, { store_id: 'store-2', quote_id: 'dq_other' }],
    })
  })

  it("reports shops without a pick, with another shop's quote, and that cannot be delivered", () => {
    const blocked: BasketQuote = { store_id: 'store-3', status: 'unavailable', reason: 'outside_market', options: [] }
    expect(checkoutDeliveries([basket, other, blocked], { 'store-1': 'dq_other' })).toEqual({
      ok: false,
      missing: ['store-1', 'store-2'],
      unavailable: ['store-3'],
    })
  })
})

describe('client delivery endpoints', () => {
  function jsonResponse(status: number, body: unknown): Response {
    return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
  }

  it('posts basket quotes', async () => {
    const body = { version: 1, market_code: 'KE', baskets: [basket] }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, body))
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test', token: 'tok' })
    const request = { market_code: 'KE', destination: { type: 'address' as const, address_id: 'addr-1' }, baskets: [{ store_id: 'store-1', items: [{ listing_id: 'l1', quantity: 1 }] }] }
    expect(await client.quoteBaskets(request)).toEqual(body)
    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe('https://api.test/logistics/basket-quotes')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(request)
  })

  it('reads and replaces a store origin and a listing package size', async () => {
    const origin = { store_id: 's 1', latitude: null, longitude: null, address_line: 'Yaya', dropoff_node_id: null, updated_at: 'now' }
    const pkg = { listing_id: 'l/1', package_size: 'medium', source: 'seller' }
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) => jsonResponse(200, url.includes('/origin') ? origin : pkg))
    const client = new MitumbaLogistics({ fetch: fetchImpl as unknown as typeof fetch, baseUrl: 'https://api.test' })
    await client.getStoreOrigin('s 1')
    await client.setStoreOrigin('s 1', { latitude: null, longitude: null, address_line: 'Yaya', dropoff_node_id: null })
    await client.getListingPackage('l/1')
    expect(await client.setListingPackage('l/1', 'medium')).toEqual(pkg)
    expect(fetchImpl.mock.calls.map(([url, init]) => [(init as RequestInit).method, url])).toEqual([
      ['GET', 'https://api.test/logistics/stores/s%201/origin'],
      ['PUT', 'https://api.test/logistics/stores/s%201/origin'],
      ['GET', 'https://api.test/logistics/listings/l%2F1/package'],
      ['PUT', 'https://api.test/logistics/listings/l%2F1/package'],
    ])
    expect(JSON.parse((fetchImpl.mock.calls[3]![1] as RequestInit).body as string)).toEqual({ package_size: 'medium' })
  })
})
