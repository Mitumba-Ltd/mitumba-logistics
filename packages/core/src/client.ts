import type {
  BasketQuoteRequest,
  BasketQuoteResponse,
  BuyerOrderParcelView,
  DeliverForMeOffer,
  ListingPackage,
  MarkParcelReadyInput,
  MarketsResponse,
  OrderParcelView,
  PackageSize,
  QuoteRequest,
  QuoteResponse,
  CreateParcelResponse,
  ParcelView,
  RecordCounterHandoverInput,
  ShopOrderParcelView,
  StoreOrigin,
  StoreOriginInput,
} from '@mitumbadotafrica/logistics-contract'
import { HttpClient } from './http'
import type { MitumbaLogisticsConfig, RequestOptions } from './config'

/**
 * Input to book a parcel against a prior quote. The sender is Mitumba's masked
 * identity, supplied by the caller (the orders flow) — never a seller identity.
 * `weight_grams` is the real parcel weight (the carrier books and bills by it).
 */
export interface CreateParcelInput {
  quote_id: string
  weight_grams: number
  sender: ShipmentPartyInput
  recipient: ShipmentPartyInput
}

export interface ShipmentPartyInput {
  name: string
  phone: string
  city_id?: string | null
  node_id?: string
  address_line?: string
  point?: { latitude: number; longitude: number }
}

/**
 * The headless, carrier-neutral Mitumba Logistics client. Knows the shape of the
 * HTTP contract (via @mitumbadotafrica/logistics-contract) and nothing about how parcels
 * are booked, routed, or tracked. No carrier implementations, no secrets.
 *
 * The buyer picks a fulfilment METHOD in {@link quote}; the backend chooses the
 * carrier. Carrier identity returned in responses is observable metadata — never
 * something the client switches on to drive the flow.
 */
export class MitumbaLogistics {
  private readonly http: HttpClient

  constructor(config: MitumbaLogisticsConfig = {}) {
    this.http = new HttpClient(config)
  }

  /** Public market discovery: markets, currencies, fulfilment methods. */
  async getMarkets(options?: RequestOptions): Promise<MarketsResponse> {
    return this.http.get<MarketsResponse>('/logistics/markets', options)
  }

  /**
   * Route and price a parcel for the chosen method. Returns the chosen (cheapest)
   * option plus alternatives; each option carries its persisted `quote_id` to
   * pass to {@link createParcel}.
   */
  async quote(input: QuoteRequest, options?: RequestOptions): Promise<QuoteResponse> {
    return this.http.post<QuoteResponse>('/logistics/quotes', input, options)
  }

  /** Book the carrier chosen by a prior quote and create the parcel. */
  async createParcel(input: CreateParcelInput, options?: RequestOptions): Promise<CreateParcelResponse> {
    return this.http.post<CreateParcelResponse>('/logistics/parcels', input, options)
  }

  /**
   * Buyer-facing parcel view: the normalized status plus the dual-surface
   * carrier tracking passthrough. The collection code is never returned — only
   * whether one exists.
   */
  async getParcel(parcelId: string, options?: RequestOptions): Promise<ParcelView> {
    return this.http.get<ParcelView>(`/logistics/parcels/${encodeURIComponent(parcelId)}`, options)
  }

  /**
   * Price each shop basket before any order exists. Origin is the shop (derived
   * by the backend); destination is the buyer's saved address or a "Deliver to"
   * point. Each available basket has one option per door method and one per
   * nearby pickup hub; pass the picked option's `quote_id` per shop to checkout.
   * An unservable basket comes back `unavailable` with a reason, not as an error.
   * Requires the buyer's token.
   */
  async quoteBaskets(input: BasketQuoteRequest, options?: RequestOptions): Promise<BasketQuoteResponse> {
    return this.http.post<BasketQuoteResponse>('/logistics/basket-quotes', input, options)
  }

  /** Seller: where a shop's parcels start. Fields are null until set. */
  async getStoreOrigin(storeId: string, options?: RequestOptions): Promise<StoreOrigin> {
    return this.http.get<StoreOrigin>(`/logistics/stores/${encodeURIComponent(storeId)}/origin`, options)
  }

  /** Seller: replace a shop's dispatch point. */
  async setStoreOrigin(storeId: string, input: StoreOriginInput, options?: RequestOptions): Promise<StoreOrigin> {
    return this.http.put<StoreOrigin>(`/logistics/stores/${encodeURIComponent(storeId)}/origin`, input, options)
  }

  /** Seller: a listing's package size, or its category default when unset. */
  async getListingPackage(listingId: string, options?: RequestOptions): Promise<ListingPackage> {
    return this.http.get<ListingPackage>(`/logistics/listings/${encodeURIComponent(listingId)}/package`, options)
  }

  /** Seller: set a listing's package size. */
  async setListingPackage(listingId: string, packageSize: PackageSize, options?: RequestOptions): Promise<ListingPackage> {
    return this.http.put<ListingPackage>(
      `/logistics/listings/${encodeURIComponent(listingId)}/package`,
      { package_size: packageSize },
      options,
    )
  }

  /**
   * An order's parcel. The shop (the seller, or a team member who may read orders) gets the
   * handover; the buyer gets their own destination. Opens the parcel if the order is paid and it
   * has not opened yet. Errors: 404 `order_not_found` / `parcel_not_found`.
   */
  async getOrderParcel(orderId: string, options?: RequestOptions): Promise<OrderParcelView> {
    return this.http.get<OrderParcelView>(`/logistics/orders/${encodeURIComponent(orderId)}/parcel`, options)
  }

  /**
   * Shop: whether a rider can collect a point-method parcel from the stall, the fee, and what the
   * shop is paid after it. Errors: 403 `forbidden` for a member who may not fulfil orders.
   */
  async getDeliverForMeOffer(parcelId: string, options?: RequestOptions): Promise<DeliverForMeOffer> {
    return this.http.get<DeliverForMeOffer>(`/logistics/parcels/${encodeURIComponent(parcelId)}/deliver-for-me`, options)
  }

  /**
   * Shop: the parcel is ready. A point method needs `first_mile`; for deliver for me pass the fee
   * shown as `expected_fee_minor`. Errors (409): `parcel_not_awaiting_handover`, `already_ready`,
   * `deliver_for_me_unavailable` (with `reason`), `fee_changed` (read it with `feeChangedOf`);
   * (400) `first_mile_required`, `collected_at_stall`; (502/503) a partner booking failed.
   */
  async markParcelReady(parcelId: string, input: MarkParcelReadyInput = {}, options?: RequestOptions): Promise<ShopOrderParcelView> {
    return this.http.post<ShopOrderParcelView>(`/logistics/parcels/${encodeURIComponent(parcelId)}/ready`, input, options)
  }

  /**
   * Shop: record a counter partner's handover, with its waybill and the fare paid. Errors (409):
   * `handover_recorded_by_carrier` (an API partner records its own), `not_ready`, `already_handed_over`.
   */
  async recordCounterHandover(parcelId: string, input: RecordCounterHandoverInput, options?: RequestOptions): Promise<ShopOrderParcelView> {
    return this.http.post<ShopOrderParcelView>(`/logistics/parcels/${encodeURIComponent(parcelId)}/handover`, input, options)
  }

  /**
   * Buyer: the parcel arrived. Errors: 409 `parcel_not_in_transit` (with the current `status`).
   */
  async confirmParcelReceived(parcelId: string, options?: RequestOptions): Promise<BuyerOrderParcelView> {
    return this.http.post<BuyerOrderParcelView>(`/logistics/parcels/${encodeURIComponent(parcelId)}/received`, {}, options)
  }
}
