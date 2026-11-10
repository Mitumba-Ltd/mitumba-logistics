import type {
  MarketsResponse,
  QuoteRequest,
  QuoteResponse,
  CreateParcelResponse,
  ParcelView,
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
}
