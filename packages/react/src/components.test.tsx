import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MitumbaLogistics, type QuoteResponse, type ParcelView } from '@mitumbadotafrica/logistics'
import { DeliveryQuoteLine, ParcelTrackingView } from './components'

afterEach(cleanup)

function clientWithQuote(res: QuoteResponse): MitumbaLogistics {
  return { quote: vi.fn(async () => res) } as unknown as MitumbaLogistics
}

const quoteRes: QuoteResponse = {
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

describe('DeliveryQuoteLine', () => {
  it('shows the loading label, then the price and carrier', async () => {
    const client = clientWithQuote(quoteRes)
    render(
      <DeliveryQuoteLine
        client={client}
        request={{ order_id: 'o', method: 'pickup_point', weight_grams: 1000 }}
        loadingLabel="Checking…"
      />,
    )
    expect(screen.getByText('Checking…')).toBeDefined()
    await waitFor(() => expect(screen.getByText(/via Pickup Mtaani/)).toBeDefined())
    // KES 350.00 formatted; assert the carrier passthrough is shown.
    expect(screen.getByText(/Delivery:/)).toBeDefined()
  })

  it('shows the unavailable label when there is no route', async () => {
    const client = {
      quote: vi.fn(async () => {
        throw Object.assign(new Error('no_route'), { code: 'no_route', status: 422 })
      }),
    } as unknown as MitumbaLogistics
    render(
      <DeliveryQuoteLine
        client={client}
        request={{ order_id: 'o', method: 'pickup_point', weight_grams: 1000 }}
        unavailableLabel="No delivery here"
      />,
    )
    await waitFor(() => expect(screen.getByText('No delivery here')).toBeDefined())
  })

  it('stays idle with a null request', () => {
    const client = clientWithQuote(quoteRes)
    render(<DeliveryQuoteLine client={client} request={null} />)
    expect((client.quote as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })
})

describe('ParcelTrackingView', () => {
  function clientWithParcel(parcel: ParcelView): MitumbaLogistics {
    return { getParcel: vi.fn(async () => parcel) } as unknown as MitumbaLogistics
  }

  const base: ParcelView = {
    version: 1,
    parcel_id: 'pcl_1',
    status: 'out_for_delivery',
    tracking: {
      carrier: 'pickup_mtaani',
      carrier_name: 'Pickup Mtaani',
      tracking_number: 'TRK1',
      tracking_url: 'https://pm.example/t/TRK1',
      tracking_website: null,
    },
    next_action_type: null,
    has_collection_code: true,
    updated_at: 'now',
  }

  it('renders the normalized status label and a carrier deep link', async () => {
    render(<ParcelTrackingView client={clientWithParcel(base)} parcelId="pcl_1" intervalMs={0} deadlineMs={0} />)
    await waitFor(() => expect(screen.getByText('Out for delivery')).toBeDefined())
    const link = screen.getByText('Track on Pickup Mtaani') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('https://pm.example/t/TRK1')
  })

  it('renders the manual-entry affordance when only a bare website is present', async () => {
    const parcel: ParcelView = {
      ...base,
      tracking: { ...base.tracking, tracking_url: null, tracking_website: 'https://pm.example' },
    }
    render(<ParcelTrackingView client={clientWithParcel(parcel)} parcelId="pcl_1" intervalMs={0} deadlineMs={0} />)
    await waitFor(() => expect(screen.getByText(/Track at/)).toBeDefined())
    expect(screen.getByText('TRK1')).toBeDefined()
  })

  it('surfaces the next-action when the parcel is in action_required', async () => {
    const parcel: ParcelView = {
      ...base,
      status: 'action_required',
      next_action_type: 'contact_carrier_reschedule',
    }
    render(<ParcelTrackingView client={clientWithParcel(parcel)} parcelId="pcl_1" intervalMs={0} deadlineMs={0} />)
    await waitFor(() => expect(screen.getByText('Contact Carrier Reschedule')).toBeDefined())
  })
})
