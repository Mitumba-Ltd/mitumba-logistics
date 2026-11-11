import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MitumbaLogistics,
  LogisticsError,
  type BasketQuote,
  type BasketQuoteRequest,
} from '@mitumbadotafrica/logistics'

/**
 * Headless hook for a checkout's delivery step: prices every shop basket for the
 * buyer's destination (POST /logistics/basket-quotes) and exposes one
 * {@link BasketQuote} per shop. Re-quotes whenever the request changes (another
 * destination, a quantity change), keeps at most one response current, and
 * surfaces a typed error without throwing. An unservable basket is not an
 * error: it comes back `unavailable` with a reason.
 */
export interface UseBasketQuotesState {
  loading: boolean
  /** One entry per shop, in request order; empty before the first answer. */
  baskets: BasketQuote[]
  error: LogisticsError | null
  /** Re-price (e.g. after a quote's `expires_at` has passed). */
  refresh: () => void
}

export interface UseBasketQuotesOptions {
  client?: MitumbaLogistics
  /** The buyer's bearer token (or token source) when no client is supplied. */
  token?: string | (() => string | undefined | Promise<string | undefined>)
  baseUrl?: string
  /** The baskets and destination, or null to stay idle (e.g. no destination yet). */
  request: BasketQuoteRequest | null
  onQuoted?: (baskets: BasketQuote[]) => void
}

export function useBasketQuotes(options: UseBasketQuotesOptions): UseBasketQuotesState {
  const { request, onQuoted } = options
  const [loading, setLoading] = useState(false)
  const [baskets, setBaskets] = useState<BasketQuote[]>([])
  const [error, setError] = useState<LogisticsError | null>(null)
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

  const requestKey = request ? JSON.stringify(request) : null

  const run = useCallback(
    (req: BasketQuoteRequest | null) => {
      const seq = ++requestSeq.current
      if (!req) {
        setLoading(false)
        setBaskets([])
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      clientRef
        .current!.quoteBaskets(req)
        .then((res) => {
          if (seq !== requestSeq.current) return
          setBaskets(res.baskets)
          setLoading(false)
          onQuoted?.(res.baskets)
        })
        .catch((e: unknown) => {
          if (seq !== requestSeq.current) return
          setBaskets([])
          setError(e instanceof LogisticsError ? e : new LogisticsError(0, { error: 'unknown_error' }))
          setLoading(false)
        })
    },
    [onQuoted],
  )

  useEffect(() => {
    run(requestKey ? (JSON.parse(requestKey) as BasketQuoteRequest) : null)
    return () => {
      requestSeq.current++
    }
  }, [requestKey, run])

  const refresh = useCallback(() => {
    run(requestKey ? (JSON.parse(requestKey) as BasketQuoteRequest) : null)
  }, [requestKey, run])

  return { loading, baskets, error, refresh }
}
