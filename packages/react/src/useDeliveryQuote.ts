import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MitumbaLogistics,
  LogisticsError,
  type QuoteRequest,
  type QuoteOption,
} from '@mitumbadotafrica/logistics'

/**
 * Headless hook that fetches a delivery quote for a chosen fulfilment method and
 * exposes it for inline rendering on a product, cart, or checkout surface — the
 * embedded (not wizard) model. The buyer picks a METHOD; the backend chooses the
 * carrier, returned as observable metadata on each option.
 *
 * The hook keeps at most one request in flight, ignores stale responses after a
 * re-quote or unmount, and surfaces a typed error (incl. the backend's `no_route`
 * reason) without throwing.
 */
export interface UseDeliveryQuoteState {
  loading: boolean
  /** The chosen (cheapest) option, or null before the first successful quote. */
  chosen: QuoteOption | null
  /** Other viable options the backend priced, for a "more options" affordance. */
  alternatives: QuoteOption[]
  error: LogisticsError | null
  /** Re-run the quote (e.g. after the buyer changes destination). */
  refresh: () => void
}

export interface UseDeliveryQuoteOptions {
  /** A configured client, or config to build one. */
  client?: MitumbaLogistics
  /** Bearer token (or token source) when no client is supplied. */
  token?: string | (() => string | undefined | Promise<string | undefined>)
  baseUrl?: string
  /**
   * The quote request, or null to defer (e.g. until the buyer has chosen a
   * destination). When null, the hook stays idle and clears any prior result.
   */
  request: QuoteRequest | null
  /** Fired once per successful quote with the chosen option. */
  onQuoted?: (chosen: QuoteOption) => void
}

export function useDeliveryQuote(options: UseDeliveryQuoteOptions): UseDeliveryQuoteState {
  const { request, onQuoted } = options
  const [loading, setLoading] = useState(false)
  const [chosen, setChosen] = useState<QuoteOption | null>(null)
  const [alternatives, setAlternatives] = useState<QuoteOption[]>([])
  const [error, setError] = useState<LogisticsError | null>(null)

  // A monotonically increasing request id so a slow earlier response never
  // overwrites a newer one (last-write-wins by request order).
  const requestSeq = useRef(0)

  const clientRef = useRef<MitumbaLogistics | null>(null)
  if (!clientRef.current) {
    clientRef.current =
      options.client ??
      new MitumbaLogistics({
        ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
        ...(options.token ? { token: options.token } : {}),
      })
  }

  // Serialise the request so the effect only re-runs on a meaningful change.
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
    [onQuoted],
  )

  useEffect(() => {
    run(requestKey ? (JSON.parse(requestKey) as QuoteRequest) : null)
    return () => {
      // Invalidate any in-flight response on unmount / request change.
      requestSeq.current++
    }
  }, [requestKey, run])

  const refresh = useCallback(() => {
    run(requestKey ? (JSON.parse(requestKey) as QuoteRequest) : null)
  }, [requestKey, run])

  return { loading, chosen, alternatives, error, refresh }
}
