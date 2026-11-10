import { useEffect, useRef, useState } from 'react'
import {
  MitumbaLogistics,
  pollParcel,
  LogisticsError,
  isTerminalParcelStatus,
  type ParcelView,
} from '@mitumbadotafrica/logistics'

/**
 * Headless hook that tracks a parcel for inline rendering in the buyer's order
 * view. It polls the normalized status and surfaces the dual-surface carrier
 * tracking passthrough, stopping when the parcel is terminal or needs the buyer
 * (action_required) so the host can render the NextAction. An unknown status is
 * never treated as a failure — the underlying poll keeps going.
 */
export interface UseParcelTrackingState {
  loading: boolean
  parcel: ParcelView | null
  error: LogisticsError | null
  /** True once the parcel reaches a terminal status (delivered/returned/…). */
  terminal: boolean
  /** True while the parcel is parked awaiting a buyer action. */
  actionRequired: boolean
}

export interface UseParcelTrackingOptions {
  client?: MitumbaLogistics
  token?: string | (() => string | undefined | Promise<string | undefined>)
  baseUrl?: string
  /** The parcel to track, or null to stay idle. */
  parcelId: string | null
  /** Base poll interval (ms). Default 15000. */
  intervalMs?: number
  /** Client-side poll deadline (ms). Default 600000. */
  deadlineMs?: number
}

export function useParcelTracking(options: UseParcelTrackingOptions): UseParcelTrackingState {
  const { parcelId, intervalMs, deadlineMs } = options
  const [loading, setLoading] = useState(false)
  const [parcel, setParcel] = useState<ParcelView | null>(null)
  const [error, setError] = useState<LogisticsError | null>(null)

  const clientRef = useRef<MitumbaLogistics | null>(null)
  if (!clientRef.current) {
    clientRef.current =
      options.client ??
      new MitumbaLogistics({
        ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
        ...(options.token ? { token: options.token } : {}),
      })
  }

  useEffect(() => {
    if (!parcelId) {
      setLoading(false)
      setParcel(null)
      setError(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    pollParcel(clientRef.current!, parcelId, {
      signal: controller.signal,
      ...(intervalMs !== undefined ? { intervalMs } : {}),
      ...(deadlineMs !== undefined ? { deadlineMs } : {}),
      onUpdate: (p) => {
        if (!controller.signal.aborted) setParcel(p)
      },
    })
      .then(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof LogisticsError ? e : new LogisticsError(0, { error: 'unknown_error' }))
        setLoading(false)
      })

    return () => controller.abort()
  }, [parcelId, intervalMs, deadlineMs])

  return {
    loading,
    parcel,
    error,
    terminal: parcel ? isTerminalParcelStatus(parcel.status) : false,
    actionRequired: parcel?.status === 'action_required',
  }
}
