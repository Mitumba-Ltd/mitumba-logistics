import { isTerminalParcelStatus, type ParcelView } from '@mitumba/logistics-contract'
import type { RequestOptions } from './config'
import type { MitumbaLogistics } from './client'

export interface PollParcelOptions {
  /** Fired on every successful status read. */
  onUpdate?: (parcel: ParcelView) => void
  /**
   * Client-side safety deadline (ms). When exceeded, polling stops and
   * `onTimeout` fires. This is "still in transit" — it must NOT be treated as a
   * delivery failure. Default 600000 (10 min); parcels are long-lived, so hosts
   * typically poll a view open on screen rather than to completion.
   */
  deadlineMs?: number
  onTimeout?: (last: ParcelView | null) => void
  /** Abort signal to stop polling. */
  signal?: AbortSignal
  /** Base interval between reads (ms). Default 15000. */
  intervalMs?: number
  /** Fractional jitter applied to each interval. Default 0.2. */
  jitter?: number
  /**
   * Stop as soon as the parcel needs the buyer (status `action_required`), so the
   * host can surface the NextAction. Default true. When false, polling continues
   * through an action_required park (it is non-terminal and resumable).
   */
  stopOnActionRequired?: boolean
}

/**
 * Poll a parcel's status until it reaches a terminal state (delivered, returned,
 * cancelled, lost), needs buyer action, the deadline passes, or the signal
 * aborts. Keeps at most one request in flight. Critically, an UNKNOWN status is
 * treated as non-terminal and keeps polling — elapsed client time never invents
 * a terminal outcome. Resolves with the last view read.
 */
export async function pollParcel(
  client: MitumbaLogistics,
  parcelId: string,
  options: PollParcelOptions = {},
): Promise<ParcelView | null> {
  const deadlineMs = options.deadlineMs ?? 600_000
  const intervalMs = options.intervalMs ?? 15_000
  const jitter = options.jitter ?? 0.2
  const stopOnAction = options.stopOnActionRequired ?? true
  const startedAt = Date.now()
  let last: ParcelView | null = null

  for (;;) {
    if (options.signal?.aborted) return last

    const reqOptions: RequestOptions = options.signal ? { signal: options.signal } : {}
    last = await client.getParcel(parcelId, reqOptions)
    options.onUpdate?.(last)

    if (isTerminalParcelStatus(last.status)) return last
    if (stopOnAction && last.status === 'action_required') return last

    if (Date.now() - startedAt >= deadlineMs) {
      options.onTimeout?.(last)
      return last
    }

    const wait = applyJitter(intervalMs, jitter)
    const remaining = deadlineMs - (Date.now() - startedAt)
    await sleep(Math.min(wait, Math.max(remaining, 0)), options.signal)
  }
}

function applyJitter(baseMs: number, jitter: number): number {
  if (jitter <= 0) return baseMs
  const delta = baseMs * jitter
  return Math.round(baseMs - delta + Math.random() * 2 * delta)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) return resolve()
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
