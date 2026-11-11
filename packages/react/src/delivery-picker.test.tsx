import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MitumbaLogistics, type BasketQuote, type BasketQuoteResponse } from '@mitumbadotafrica/logistics'
import { BasketDeliveryPicker, PickupHubPicker } from './delivery-picker'
import { useBasketQuotes } from './useBasketQuotes'

afterEach(cleanup)

const hub = (id: string, name: string, hours?: string) => ({
  node_id: id,
  name,
  address: `${name} Road`,
  latitude: -0.1,
  longitude: 34.7,
  ...(hours ? { opening_hours: hours } : {}),
})

const basket: BasketQuote = {
  store_id: 'store-1',
  status: 'available',
  options: [
    { quote_id: 'dq_h1', method: 'pickup_point', carrier: 'pickup_mtaani', carrier_name: 'Pickup Mtaani', price: { currency: 'KES', minor_units: 27_000 }, expires_at: 'x', hub: hub('h1', 'Kondele', '08:00-20:00') },
    { quote_id: 'dq_h2', method: 'pickup_point', carrier: 'pickup_mtaani', carrier_name: 'Pickup Mtaani', price: { currency: 'KES', minor_units: 25_000 }, expires_at: 'x', hub: hub('h2', 'Milimani') },
    { quote_id: 'dq_door', method: 'doorstep', carrier: 'pickup_mtaani', carrier_name: 'Pickup Mtaani', price: { currency: 'KES', minor_units: 43_000 }, expires_at: 'x' },
    { quote_id: 'dq_fast', method: 'same_day', carrier: 'uber_direct', carrier_name: 'Uber Direct', price: { currency: 'KES', minor_units: 52_000 }, expires_at: 'x', eta: { min_days: 0, max_days: 1 } },
  ],
}

function Controlled({ initial = null as string | null, basket: b = basket }) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <>
      <BasketDeliveryPicker basket={b} value={value} onChange={setValue} legend="Shop One" />
      <output data-testid="picked">{value ?? 'none'}</output>
    </>
  )
}

describe('BasketDeliveryPicker', () => {
  it('offers each method once with its starting price, ETA and carrier', () => {
    render(<Controlled />)
    expect(screen.getByText('Shop One')).toBeDefined()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByText('Pickup point')).toBeDefined()
    expect(screen.getByText(/^from /)).toBeDefined()
    expect(screen.getByText(/Same day/)).toBeDefined()
    expect(screen.getByText('via Uber Direct')).toBeDefined()
    // No hub list until a pickup method is chosen.
    expect(screen.queryByText('Choose a pickup point')).toBeNull()
  })

  it('picks the cheapest hub for a pickup method, then lets the buyer choose another hub', () => {
    render(<Controlled />)
    fireEvent.click(screen.getByLabelText(/Pickup point/))
    expect(screen.getByTestId('picked').textContent).toBe('dq_h2')
    expect(screen.getByText('Choose a pickup point')).toBeDefined()
    expect(screen.getByText(/08:00-20:00/)).toBeDefined()
    fireEvent.click(screen.getByLabelText(/Kondele/))
    expect(screen.getByTestId('picked').textContent).toBe('dq_h1')
  })

  it('picks the single option of a door method', () => {
    render(<Controlled />)
    fireEvent.click(screen.getByLabelText(/Door delivery/))
    expect(screen.getByTestId('picked').textContent).toBe('dq_door')
    expect(screen.queryByText('Choose a pickup point')).toBeNull()
  })

  it('takes label overrides and a custom hub renderer', () => {
    render(
      <BasketDeliveryPicker
        basket={basket}
        value="dq_h1"
        onChange={() => {}}
        methodLabels={{ pickup_point: 'Collect nearby' }}
        renderHub={(option) => <span>Hub card {option.hub?.node_id}</span>}
      />,
    )
    expect(screen.getByText('Delivery')).toBeDefined()
    expect(screen.getByText('Collect nearby')).toBeDefined()
    expect(screen.getByText('Hub card h2')).toBeDefined()
  })

  it('shows why a basket cannot be delivered, with no controls', () => {
    render(<Controlled basket={{ store_id: 'store-2', status: 'unavailable', reason: 'outside_market', options: [] }} />)
    expect(screen.getByText(/does not deliver/).getAttribute('role')).toBe('status')
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('shows the generic reason for an unavailable basket without a legend', () => {
    render(<BasketDeliveryPicker basket={{ store_id: 's', status: 'unavailable', options: [] }} value={null} onChange={() => {}} unavailableLabels={{ '': 'Nope' }} />)
    expect(screen.getByRole('status').textContent).toBe('Nope')
  })
})

describe('PickupHubPicker', () => {
  it('renders hubs with a custom legend and reports the pick', () => {
    const onChange = vi.fn()
    render(<PickupHubPicker options={basket.options.slice(0, 2)} value={null} onChange={onChange} legend="Where to collect" />)
    expect(screen.getByText('Where to collect')).toBeDefined()
    fireEvent.click(screen.getByLabelText(/Milimani/))
    expect(onChange).toHaveBeenCalledWith('dq_h2')
  })
})

describe('useBasketQuotes', () => {
  const response: BasketQuoteResponse = { version: 1, market_code: 'KE', baskets: [basket] }
  const request = {
    market_code: 'KE',
    destination: { type: 'address' as const, address_id: 'addr-1' },
    baskets: [{ store_id: 'store-1', items: [{ listing_id: 'l1', quantity: 1 }] }],
  }

  function Probe(props: { client: MitumbaLogistics; request: typeof request | null; onQuoted?: () => void }) {
    const state = useBasketQuotes(props)
    return (
      <div>
        <span data-testid="loading">{String(state.loading)}</span>
        <span data-testid="count">{state.baskets.length}</span>
        <span data-testid="error">{state.error?.code ?? ''}</span>
        <button onClick={state.refresh}>refresh</button>
      </div>
    )
  }

  it('prices the baskets and re-prices on refresh', async () => {
    const quoteBaskets = vi.fn(async () => response)
    const onQuoted = vi.fn()
    render(<Probe client={{ quoteBaskets } as unknown as MitumbaLogistics} request={request} onQuoted={onQuoted} />)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(onQuoted).toHaveBeenCalledWith([basket])
    fireEvent.click(screen.getByText('refresh'))
    await waitFor(() => expect(quoteBaskets).toHaveBeenCalledTimes(2))
  })

  it('surfaces a typed error, and stays idle without a request', async () => {
    const { LogisticsError } = await import('@mitumbadotafrica/logistics')
    const failing = { quoteBaskets: vi.fn(async () => { throw new LogisticsError(404, { error: 'address_not_found' }) }) }
    const { rerender } = render(<Probe client={failing as unknown as MitumbaLogistics} request={request} />)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('address_not_found'))
    rerender(<Probe client={failing as unknown as MitumbaLogistics} request={null} />)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe(''))
    expect(failing.quoteBaskets).toHaveBeenCalledTimes(1)
  })

  it('wraps an unexpected failure as unknown_error', async () => {
    const odd = { quoteBaskets: vi.fn(async () => { throw new Error('boom') }) }
    render(<Probe client={odd as unknown as MitumbaLogistics} request={request} />)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('unknown_error'))
  })
})
