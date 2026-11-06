import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MitumbaLogistics,
  pollParcel,
  LogisticsError,
  isTerminalParcelStatus,
  type QuoteRequest,
  type QuoteOption,
  type ParcelView,
} from '@mitumba/logistics'

/**
 * Headless hooks for React Native. Identical in behaviour to the web hooks but
 * kept in this package so the native build depends only on react (not react-dom
 * / DOM types). No carrier logic — the backend owns routing; carrier identity is
 * observable metadata on the results.
 */

export interface UseDeliveryQuoteOptions {
  client?: MitumbaLogistics
  token?: string | (() => string | undefined | Promise<string | undefined>)
  baseUrl?: string
  request: QuoteRequest | null
  onQuoted?: (chosen: QuoteOption) => void
}

export interface UseDeliveryQuoteState {
  loading: boolean
  chosen: QuoteOption | null
  alternatives: QuoteOption[]
  error: LogisticsError | null
  refresh: () => void
}

function useClient(opts: { client?: MitumbaLogistics; baseUrl?: string; token?: UseDeliveryQuoteOptions['token'] }) {
  const ref = useRef<MitumbaLogistics | null>(null)
  if (!ref.current) {
    ref.current =
      opts.client ??
      new MitumbaLogistics({
        ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}),
        ...(opts.token ? { token: opts.token } : {}),
      })
  }
  return ref
}

export function useDeliveryQuote(options: UseDeliveryQuoteOptions): UseDeliveryQuoteState {
  const { request, onQuoted } = options
  const [loading, setLoading] = useState(false)
  const [chosen, setChosen] = useState<QuoteOption | null>(null)
  const [alternatives, setAlternatives] = useState<QuoteOption[]>([])
  const [error, setError] = useState<LogisticsError | null>(null)
  const requestSeq = useRef(0)
  const clientRef = useClient(options)

  const requestKey = request ? JSON.stringify(request) : null

  const run = useCallback(
    (req: QuoteRequest | null) => {
      const seq = ++requestSeq.current
      if (!req) {
        setLoading(false)
        setChosen(null)
        setAlternatives([])
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      clientRef
        .current!.quote(req)
        .then((res) => {
          if (seq !== requestSeq.current) return
          setChosen(res.chosen)
          setAlternatives(res.alternatives)
          setLoading(false)
          onQuoted?.(res.chosen)
        })
        .catch((e) => {
          if (seq !== requestSeq.current) return
          setChosen(null)
          setAlternatives([])
          setError(e instanceof LogisticsError ? e : new LogisticsError(0, { error: 'unknown_error' }))
          setLoading(false)
        })
    },
    [clientRef, onQuoted],
  )

  useEffect(() => {
    run(requestKey ? (JSON.parse(requestKey) as QuoteRequest) : null)
    return () => {
      requestSeq.current++
    }
  }, [requestKey, run])

  const refresh = useCallback(() => {
    run(requestKey ? (JSON.parse(requestKey) as QuoteRequest) : null)
  }, [requestKey, run])

  return { loading, chosen, alternatives, error, refresh }
}

export interface UseParcelTrackingOptions {
  client?: MitumbaLogistics
  token?: string | (() => string | undefined | Promise<string | undefined>)
  baseUrl?: string
  parcelId: string | null
  intervalMs?: number
  deadlineMs?: number
}

export interface UseParcelTrackingState {
  loading: boolean
  parcel: ParcelView | null
  error: LogisticsError | null
  terminal: boolean
  actionRequired: boolean
}

export function useParcelTracking(options: UseParcelTrackingOptions): UseParcelTrackingState {
  const { parcelId, intervalMs, deadlineMs } = options
  const [loading, setLoading] = useState(false)
  const [parcel, setParcel] = useState<ParcelView | null>(null)
  const [error, setError] = useState<LogisticsError | null>(null)
  const clientRef = useClient(options)

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
  }, [clientRef, parcelId, intervalMs, deadlineMs])

  return {
    loading,
    parcel,
    error,
    terminal: parcel ? isTerminalParcelStatus(parcel.status) : false,
    actionRequired: parcel?.status === 'action_required',
  }
}
