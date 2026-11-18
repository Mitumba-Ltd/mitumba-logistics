import { describe, expect, it } from 'vitest'
import { deliverForMeOfferSchema, isShopParcelView, orderParcelViewSchema, type OrderParcelView } from './order-parcel'

const base = {
  version: 1,
  parcel_id: 'pcl_1',
  order_id: 'order-1',
  status: 'awaiting_dropoff',
  method: 'branch_collection',
  carrier: 'easy_coach',
  carrier_name: 'Easy Coach',
  tier: 'counter',
  tracking: { tracking_number: null, tracking_url: null, tracking_website: null },
  eta: { min_days: 1, max_days: 2 },
  destination: { kind: 'point', name: 'Kisumu Central', address: 'Oginga Odinga St' },
  updated_at: '2026-11-18T08:00:00.000Z',
}

const shop = {
  ...base,
  handover: {
    deadline: '2026-11-20T08:00:00.000Z',
    collected_at_stall: false,
    origin_point: { node_id: 'origin-nbi', name: 'Railways Terminal', address: 'Haile Selassie Ave', latitude: -1.29, longitude: 36.83 },
    ready: true,
    first_mile: { mode: 'deliver_for_me', fee: { currency: 'KES', minor_units: 25_000 }, partner: 'pickup_mtaani' },
    counter_receipt: { waybill_number: 'WB-1', fare: { currency: 'KES', minor_units: 30_000 }, paid_by: 'collection_partner' },
  },
}

describe('orderParcelViewSchema', () => {
  it("accepts the shop's view, with its handover", () => {
    const parsed = orderParcelViewSchema.parse(shop) as OrderParcelView
    expect(isShopParcelView(parsed)).toBe(true)
  })

  it("accepts the buyer's view of a point and of their own door, and the shop's region-only door", () => {
    expect(isShopParcelView(orderParcelViewSchema.parse(base) as OrderParcelView)).toBe(false)
    const door = { ...base, method: 'doorstep', tier: 'api', eta: null, destination: { kind: 'door', label: 'Home', line1: 'Milimani Rd', city: 'Kisumu', region: 'Kisumu' } }
    expect(orderParcelViewSchema.safeParse(door).success).toBe(true)
    const shopDoor = { ...shop, destination: { kind: 'door', region: 'Kisumu' }, handover: { ...shop.handover, origin_point: null, collected_at_stall: true, first_mile: null, counter_receipt: null } }
    expect(orderParcelViewSchema.safeParse(shopDoor).success).toBe(true)
  })

  it('refuses another contract version or a negative fee', () => {
    expect(orderParcelViewSchema.safeParse({ ...base, version: 2 }).success).toBe(false)
    expect(orderParcelViewSchema.safeParse({ ...shop, handover: { ...shop.handover, first_mile: { mode: 'deliver_for_me', fee: { currency: 'KES', minor_units: -1 } } } }).success).toBe(false)
  })
})

describe('deliverForMeOfferSchema', () => {
  it('accepts an offer with the fee and the payout after it, and an unavailable answer with any reason', () => {
    expect(deliverForMeOfferSchema.safeParse({
      offered: true,
      partner: 'pickup_mtaani',
      partner_name: 'Pickup Mtaani',
      fee: { currency: 'KES', minor_units: 25_000 },
      item_amount: { currency: 'KES', minor_units: 120_000 },
      payout_after_fee: { currency: 'KES', minor_units: 95_000 },
    }).success).toBe(true)
    expect(deliverForMeOfferSchema.safeParse({ offered: false, reason: 'stall_location_missing', item_amount: { currency: 'KES', minor_units: 120_000 } }).success).toBe(true)
    expect(deliverForMeOfferSchema.safeParse({ offered: false, reason: 'a_new_reason', item_amount: { currency: 'KES', minor_units: 1 } }).success).toBe(true)
  })

  it('refuses an offer without its fee', () => {
    expect(deliverForMeOfferSchema.safeParse({ offered: true, partner: 'x', partner_name: 'X', item_amount: { currency: 'KES', minor_units: 1 } }).success).toBe(false)
  })
})
