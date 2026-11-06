import { describe, it, expect, vi } from 'vitest'
import { MitumbaLogistics } from './client'
import { LogisticsError } from './errors'
import { pollParcel } from './polling'
import type { ParcelView } from '@mitumba/logistics-contract'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('MitumbaLogistics client', () => {
  it('fetches markets from the public endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { version: 1, markets: [], updated_at: 'now' }),
    )
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test' })
    const res = await client.getMarkets()
    expect(res.version).toBe(1)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.test/logistics/markets')
  })

  it('posts a quote and returns the chosen option', async () => {
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
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, body))
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test' })
    const res = await client.quote({
      order_id: 'order-1',
      method: 'pickup_point',
      weight_grams: 1000,
    })
    expect(res.chosen.quote_id).toBe('sq_1')
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.test/logistics/quotes')
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it('creates a parcel', async () => {
    const body = {
      version: 1,
      parcel_id: 'pcl_1',
      status: 'created',
      carrier: 'pickup_mtaani',
      uses_collection_code: true,
      tracking: { carrier_name: 'Pickup Mtaani', tracking_number: 'TRK1', tracking_url: null, tracking_website: null },
    }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, body))
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test' })
    const res = await client.createParcel({
      quote_id: 'sq_1',
      weight_grams: 1000,
      sender: { name: 'Mitumba', phone: '+254700000000' },
      recipient: { name: 'Buyer', phone: '+254711111111' },
    })
    expect(res.parcel_id).toBe('pcl_1')
    expect(res.uses_collection_code).toBe(true)
  })

  it('throws a typed LogisticsError on a non-2xx with the reason', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(422, { error: 'no_route', reason: 'not_serviceable' }))
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test' })
    await expect(client.quote({ order_id: 'o', method: 'pickup_point', weight_grams: 1 }))
      .rejects.toMatchObject({ code: 'no_route', reason: 'not_serviceable', status: 422 })
  })

  it('marks 503 errors as temporary', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, { error: 'no_carriers_configured' }))
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test' })
    try {
      await client.quote({ order_id: 'o', method: 'pickup_point', weight_grams: 1 })
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(LogisticsError)
      expect((e as LogisticsError).isTemporary).toBe(true)
    }
  })

  it('attaches a bearer token when configured', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { version: 1, markets: [], updated_at: 'now' }))
    const client = new MitumbaLogistics({ fetch: fetchImpl, baseUrl: 'https://api.test', token: 'tok' })
    await client.getMarkets()
    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer tok')
  })
})

describe('pollParcel', () => {
  function parcel(status: string): ParcelView {
    return {
      version: 1,
      parcel_id: 'pcl_1',
      status,
      tracking: { carrier: 'pickup_mtaani', carrier_name: 'Pickup Mtaani', tracking_number: null, tracking_url: null, tracking_website: null },
      next_action_type: status === 'action_required' ? 'contact_carrier_reschedule' : null,
      has_collection_code: false,
      updated_at: 'now',
    }
  }

  it('stops at a terminal status', async () => {
    const views = [parcel('in_transit'), parcel('delivered')]
    let i = 0
    const client = { getParcel: vi.fn(async () => views[i++]!) } as unknown as MitumbaLogistics
    const updates: string[] = []
    const last = await pollParcel(client, 'pcl_1', { intervalMs: 0, onUpdate: (p) => updates.push(p.status) })
    expect(last?.status).toBe('delivered')
    expect(updates).toEqual(['in_transit', 'delivered'])
  })

  it('stops on action_required by default so the host can surface the NextAction', async () => {
    const client = { getParcel: vi.fn(async () => parcel('action_required')) } as unknown as MitumbaLogistics
    const last = await pollParcel(client, 'pcl_1', { intervalMs: 0 })
    expect(last?.status).toBe('action_required')
    expect(last?.next_action_type).toBe('contact_carrier_reschedule')
  })

  it('treats an unknown status as non-terminal (keeps polling, never invents failure)', async () => {
    const views = [parcel('some_future_status'), parcel('delivered')]
    let i = 0
    const client = { getParcel: vi.fn(async () => views[Math.min(i++, views.length - 1)]!) } as unknown as MitumbaLogistics
    const last = await pollParcel(client, 'pcl_1', { intervalMs: 0 })
    expect(last?.status).toBe('delivered')
  })

  it('respects the deadline and fires onTimeout', async () => {
    const client = { getParcel: vi.fn(async () => parcel('in_transit')) } as unknown as MitumbaLogistics
    let timedOut = false
    const last = await pollParcel(client, 'pcl_1', { intervalMs: 0, deadlineMs: 0, onTimeout: () => { timedOut = true } })
    expect(timedOut).toBe(true)
    expect(last?.status).toBe('in_transit')
  })

  it('returns immediately when the signal is already aborted', async () => {
    const client = { getParcel: vi.fn() } as unknown as MitumbaLogistics
    const ctrl = new AbortController()
    ctrl.abort()
    const last = await pollParcel(client, 'pcl_1', { signal: ctrl.signal })
    expect(last).toBeNull()
    expect(client.getParcel).not.toHaveBeenCalled()
  })
})
