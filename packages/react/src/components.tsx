import { type ReactNode } from 'react'
import type { ParcelView, QuoteOption } from '@mitumba/logistics'
import { useDeliveryQuote, type UseDeliveryQuoteOptions } from './useDeliveryQuote'
import { useParcelTracking, type UseParcelTrackingOptions } from './useParcelTracking'

/**
 * Minimal, unstyled view primitives. They render structure and text only — no
 * design tokens, no CSS — so the host app themes them to match its surface.
 * This keeps the SDK free of styling opinions while still shipping working,
 * accessible defaults. Hosts that want full control can use the hooks directly.
 */

/** Format a Money as a localised currency string. */
function formatMoney(amount: { currency: string; minor_units: number }): string {
  const major = amount.minor_units / 100
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: amount.currency }).format(major)
  } catch {
    // Unknown currency code: fall back to a plain "<CODE> <amount>" form.
    return `${amount.currency} ${major.toFixed(2)}`
  }
}

export interface DeliveryQuoteLineProps extends UseDeliveryQuoteOptions {
  /** Rendered while the first quote is loading. */
  loadingLabel?: ReactNode
  /** Rendered when no route is available or an error occurs. */
  unavailableLabel?: ReactNode
  /** Custom renderer for the chosen option; overrides the default line. */
  renderChosen?: (chosen: QuoteOption) => ReactNode
}

/**
 * The inline "Delivery: KES X to <place>" line for a product or cart surface —
 * the AliExpress-style affordance shown before checkout. Carrier name is shown
 * as trust-building observable metadata ("via Pickup Mtaani"); it is never a
 * control the buyer uses to route.
 */
export function DeliveryQuoteLine(props: DeliveryQuoteLineProps): ReactNode {
  const { loading, chosen, error } = useDeliveryQuote(props)

  if (loading) {
    return <span className="mitumba-delivery-quote mitumba-delivery-quote--loading">{props.loadingLabel ?? 'Checking delivery…'}</span>
  }
  if (error || !chosen) {
    return (
      <span className="mitumba-delivery-quote mitumba-delivery-quote--unavailable">
        {props.unavailableLabel ?? 'Delivery unavailable to this location'}
      </span>
    )
  }
  if (props.renderChosen) return <>{props.renderChosen(chosen)}</>
  return (
    <span className="mitumba-delivery-quote">
      Delivery: {formatMoney(chosen.price)} <span className="mitumba-delivery-quote__carrier">via {chosen.carrier_name}</span>
    </span>
  )
}

export interface ParcelTrackingViewProps extends UseParcelTrackingOptions {
  /** Map a normalized status to buyer-facing copy. Falls back to a humanised code. */
  statusLabels?: Partial<Record<string, string>>
  loadingLabel?: ReactNode
}

const DEFAULT_STATUS_LABELS: Record<string, string> = {
  created: 'Order placed',
  awaiting_dropoff: 'Awaiting drop-off',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  action_required: 'Action needed',
  delivered: 'Delivered',
  returned: 'Returned to sender',
  cancelled: 'Cancelled',
  lost: 'Lost in transit',
}

function humanise(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Render the carrier passthrough affordance: a deep link if present, else the
 *  bare site + the number for manual entry, else nothing. */
function CarrierTrackingLink({ parcel }: { parcel: ParcelView }): ReactNode {
  const t = parcel.tracking
  if (t.tracking_url) {
    return (
      <a className="mitumba-tracking__carrier-link" href={t.tracking_url} target="_blank" rel="noopener noreferrer">
        Track on {t.carrier_name}
      </a>
    )
  }
  if (t.tracking_website && t.tracking_number) {
    return (
      <span className="mitumba-tracking__carrier-manual">
        Track at{' '}
        <a href={t.tracking_website} target="_blank" rel="noopener noreferrer">
          {t.carrier_name}
        </a>{' '}
        using code <code>{t.tracking_number}</code>
      </span>
    )
  }
  return null
}

/**
 * The inline order-flow tracking view. Mitumba's normalized status is the
 * primary surface; the carrier's own tracking is offered as a secondary
 * affordance (dual-surface, the AliExpress model). When the parcel is parked in
 * action_required, the next-action type is surfaced so the host can prompt the
 * buyer (e.g. contact the carrier to reschedule).
 */
export function ParcelTrackingView(props: ParcelTrackingViewProps): ReactNode {
  const { loading, parcel, actionRequired } = useParcelTracking(props)
  const labels = { ...DEFAULT_STATUS_LABELS, ...(props.statusLabels ?? {}) }

  if (loading && !parcel) {
    return <div className="mitumba-tracking mitumba-tracking--loading">{props.loadingLabel ?? 'Loading tracking…'}</div>
  }
  if (!parcel) return null

  return (
    <div className="mitumba-tracking" data-status={parcel.status}>
      <div className="mitumba-tracking__status">{labels[parcel.status] ?? humanise(parcel.status)}</div>
      {actionRequired && parcel.next_action_type ? (
        <div className="mitumba-tracking__action" data-action={parcel.next_action_type}>
          {humanise(parcel.next_action_type)}
        </div>
      ) : null}
      <CarrierTrackingLink parcel={parcel} />
    </div>
  )
}
