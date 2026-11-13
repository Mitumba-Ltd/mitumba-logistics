// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { BasketQuote } from '@mitumbadotafrica/logistics'

// react-native resolves to test/react-native-stub.tsx (vitest.config.ts).
import { BasketDeliveryPicker, PickupHubPicker } from './delivery-picker'

afterEach(cleanup)

const hub = (id: string, name: string, hours?: string) => ({
  node_id: id, name, address: `${name} Road`, latitude: -0.1, longitude: 34.7, ...(hours ? { opening_hours: hours } : {}),
})

const basket: BasketQuote = {
  store_id: 'store-1',
  status: 'available',
  options: [
    { quote_id: 'dq_h1', method: 'pickup_point', carrier: 'pickup_mtaani', carrier_name: 'Pickup Mtaani', price: { currency: 'KES', minor_units: 27_000 }, expires_at: 'x', hub: hub('h1', 'Kondele', '08:00-20:00') },
    { quote_id: 'dq_h2', method: 'pickup_point', carrier: 'pickup_mtaani', carrier_name: 'Pickup Mtaani', price: { currency: 'KES', minor_units: 25_000 }, expires_at: 'x', hub: hub('h2', 'Milimani') },
    { quote_id: 'dq_fast', method: 'same_day', carrier: 'uber_direct', carrier_name: 'Uber Direct', price: { currency: 'KES', minor_units: 52_000 }, expires_at: 'x', eta: { min_days: 0, max_days: 1 } },
  ],
}

function Controlled(props: { basket?: BasketQuote; selectedStyle?: Record<string, unknown> }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <>
      <BasketDeliveryPicker basket={props.basket ?? basket} value={value} onChange={setValue} legend="Shop One" {...(props.selectedStyle ? { selectedStyle: props.selectedStyle } : {})} />
      <output data-testid="picked">{value ?? 'none'}</output>
    </>
  )
}

describe('native BasketDeliveryPicker', () => {
  it('announces each method as a radio, then lists hubs for a pickup method', () => {
    render(<Controlled selectedStyle={{ opacity: 1 }} />)
    expect(screen.getByRole('radiogroup', { name: 'Shop One' })).toBeDefined()
    const methods = screen.getAllByRole('radio')
    expect(methods.map((m) => m.getAttribute('aria-checked'))).toEqual(['false', 'false'])
    expect(methods[1]!.getAttribute('aria-label')).toBe('Same-day delivery, KES 520, Within 1 day, via Uber Direct')
    fireEvent.click(methods[0]!)
    expect(screen.getByTestId('picked').textContent).toBe('dq_h2')
    expect(screen.getByRole('radiogroup', { name: 'Choose a pickup point' })).toBeDefined()
    expect(screen.getByText(/08:00-20:00/)).toBeDefined()
    fireEvent.click(screen.getByRole('radio', { name: /Kondele/ }))
    expect(screen.getByTestId('picked').textContent).toBe('dq_h1')
    expect(screen.getByRole('radio', { name: /Kondele/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('shows why a basket cannot be delivered, with no controls', () => {
    render(<Controlled basket={{ store_id: 's', status: 'unavailable', reason: 'listing_unavailable', options: [] }} />)
    expect(screen.getByText(/no longer available/)).toBeDefined()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('renders without a legend and with a custom hub renderer', () => {
    render(<BasketDeliveryPicker basket={basket} value="dq_h1" onChange={() => {}} textStyle={{}} renderHub={(o, selected) => <span>{`card ${o.hub?.node_id} ${selected}`}</span>} />)
    expect(screen.getByRole('radiogroup', { name: 'Delivery' })).toBeDefined()
    expect(screen.getByText('card h1 true')).toBeDefined()
    render(<BasketDeliveryPicker basket={{ store_id: 's', status: 'unavailable', options: [] }} value={null} onChange={() => {}} />)
    expect(screen.getByText('Delivery is unavailable for this shop.')).toBeDefined()
  })
})

describe('native BasketDeliveryPicker prices', () => {
  it("takes the host's formatter, also for the hubs, and can hide the carrier", () => {
    render(<BasketDeliveryPicker basket={basket} value="dq_h1" onChange={() => {}} showCarrier={false} formatMoney={(m) => `Sh ${m.minor_units / 100}`} />)
    const methods = screen.getAllByRole('radio')
    expect(methods[0]!.getAttribute('aria-label')).toBe('Pickup point, from Sh 250')
    expect(screen.getByRole('radio', { name: /Kondele/ }).getAttribute('aria-label')).toContain('Sh 270')
  })
})

describe('native PickupHubPicker', () => {
  it('reports the hub pressed', () => {
    const onChange = vi.fn()
    render(<PickupHubPicker options={basket.options.slice(0, 2)} value={null} onChange={onChange} legend="Where to collect" />)
    fireEvent.click(screen.getByRole('radio', { name: /Milimani/ }))
    expect(onChange).toHaveBeenCalledWith('dq_h2')
  })
})
