export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason || new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason || new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

interface RateLimitState {
  tokens: number
  maxTokens: number
  refillRate: number
  lastRefill: number
  retryAfter: number
}

const limiters: Record<string, RateLimitState> = {}

function getOrCreate(key: string): RateLimitState {
  if (!limiters[key]) {
    limiters[key] = {
      tokens: 3,
      maxTokens: 5,
      refillRate: 1500,
      lastRefill: Date.now(),
      retryAfter: 0,
    }
  }
  return limiters[key]
}

function refillTokens(state: RateLimitState): void {
  const now = Date.now()
  const elapsed = now - state.lastRefill
  const tokensToAdd = Math.floor(elapsed / state.refillRate)
  if (tokensToAdd > 0) {
    state.tokens = Math.min(state.maxTokens, state.tokens + tokensToAdd)
    state.lastRefill = now
  }
}

export async function acquireToken(key: string, signal?: AbortSignal): Promise<void> {
  const state = getOrCreate(key)

  // Check retry-after
  if (state.retryAfter > Date.now()) {
    const wait = state.retryAfter - Date.now()
    await abortableDelay(wait, signal)
  }

  refillTokens(state)

  if (state.tokens <= 0) {
    await abortableDelay(state.refillRate, signal)
    refillTokens(state)
  }

  state.tokens--
}

export function updateFromHeaders(key: string, headers: Headers): void {
  const state = getOrCreate(key)

  const retryAfter = headers.get('retry-after')
  if (retryAfter) {
    state.retryAfter = Date.now() + parseInt(retryAfter, 10) * 1000
  }

  const rateLimitRules = headers.get('x-rate-limit-ip')
  if (rateLimitRules) {
    try {
      const parts = rateLimitRules.split(',')
      if (parts.length > 0) {
        const [maxHits, period] = parts[0].split(':').map(Number)
        if (maxHits && period) {
          state.maxTokens = maxHits
          state.refillRate = Math.ceil((period * 1000) / maxHits)
        }
      }
    } catch { /* ignore parse errors */ }
  }

  const rateLimitState = headers.get('x-rate-limit-ip-state')
  if (rateLimitState) {
    try {
      const parts = rateLimitState.split(',')
      if (parts.length > 0) {
        const [currentHits] = parts[0].split(':').map(Number)
        if (currentHits !== undefined) {
          state.tokens = Math.max(0, state.maxTokens - currentHits)
        }
      }
    } catch { /* ignore */ }
  }
}
