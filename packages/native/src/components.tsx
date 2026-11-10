import { type ReactNode } from 'react'
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native'
import type { ParcelView, QuoteOption } from '@mitumbadotafrica/logistics'
import {
  useDeliveryQuote,
  useParcelTracking,
  type UseDeliveryQuoteOptions,
  type UseParcelTrackingOptions,
} from './hooks'
import { formatMoney } from './formatMoney'

/**
 * Unstyled React Native view primitives. They render RN structure and text only
 * — the host app styles them via the optional `style` props to match its
 * surface. Hosts wanting full control can use the hooks directly. No WebView.
 */

export interface DeliveryQuoteLineProps extends UseDeliveryQuoteOptions {
  style?: Record<string, unknown>
  textStyle?: Record<string, unknown>
  loadingLabel?: string
  unavailableLabel?: string
  renderChosen?: (chosen: QuoteOption) => ReactNode
}

/**
 * Inline "Delivery: KES X via <carrier>" line for a product or cart screen. The
 * carrier name is shown as observable trust metadata, never a routing control.
 */
export function DeliveryQuoteLine(props: DeliveryQuoteLineProps): ReactNode {
  const { loading, chosen, error } = useDeliveryQuote(props)

  if (loading) {
    return (
      <View style={props.style} accessibilityRole="text" accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" />
        <Text style={props.textStyle}>{props.loadingLabel ?? 'Checking delivery…'}</Text>
      </View>
    )
  }
  if (error || !chosen) {
    return (
      <View style={props.style}>
        <Text style={props.textStyle}>{props.unavailableLabel ?? 'Delivery unavailable to this location'}</Text>
      </View>
    )
  }
  if (props.renderChosen) return <>{props.renderChosen(chosen)}</>
  return (
    <View style={props.style}>
      <Text style={props.textStyle}>
        Delivery: {formatMoney(chosen.price)} via {chosen.carrier_name}
      </Text>
    </View>
  )
}

export interface ParcelTrackingViewProps extends UseParcelTrackingOptions {
  style?: Record<string, unknown>
  textStyle?: Record<string, unknown>
  statusLabels?: Partial<Record<string, string>>
  loadingLabel?: string
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

/** The carrier passthrough affordance: a tappable deep link if present, else the
 *  bare site + code for manual entry, else nothing. */
function CarrierTrackingLink({ parcel, textStyle }: { parcel: ParcelView; textStyle?: Record<string, unknown> }): ReactNode {
  const t = parcel.tracking
  if (t.tracking_url) {
    const url = t.tracking_url
    return (
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
        <Text style={textStyle}>Track on {t.carrier_name}</Text>
      </Pressable>
    )
  }
  if (t.tracking_website && t.tracking_number) {
    const site = t.tracking_website
    return (
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(site)}>
        <Text style={textStyle}>
          Track at {t.carrier_name} using code {t.tracking_number}
        </Text>
      </Pressable>
    )
  }
  return null
}

/**
 * Inline order-flow tracking view for RN. Mitumba's normalized status is the
 * primary surface; the carrier's own tracking is a secondary tappable affordance
 * (dual-surface). The next-action is surfaced while the parcel is parked in
 * action_required so the host can prompt the buyer.
 */
export function ParcelTrackingView(props: ParcelTrackingViewProps): ReactNode {
  const { loading, parcel, actionRequired } = useParcelTracking(props)
  const labels = { ...DEFAULT_STATUS_LABELS, ...(props.statusLabels ?? {}) }

  if (loading && !parcel) {
    return (
      <View style={props.style}>
        <ActivityIndicator size="small" />
        <Text style={props.textStyle}>{props.loadingLabel ?? 'Loading tracking…'}</Text>
      </View>
    )
  }
  if (!parcel) return null

  return (
    <View style={props.style} accessibilityLiveRegion="polite">
      <Text style={props.textStyle}>{labels[parcel.status] ?? humanise(parcel.status)}</Text>
      {actionRequired && parcel.next_action_type ? (
        <Text style={props.textStyle}>{humanise(parcel.next_action_type)}</Text>
      ) : null}
      <CarrierTrackingLink parcel={parcel} {...(props.textStyle ? { textStyle: props.textStyle } : {})} />
    </View>
  )
}
