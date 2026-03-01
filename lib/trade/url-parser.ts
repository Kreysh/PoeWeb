export interface ParsedTradeUrl {
  game: 'poe1' | 'poe2'
  league: string
  queryId: string
}

/**
 * Parse a pathofexile.com trade URL into its components.
 * POE1: /trade/search/{league}/{queryId}
 * POE2: /trade2/search/poe2/{league}/{queryId}
 */
export function parseTradeUrl(url: string): ParsedTradeUrl {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('URL inválida')
  }

  if (!parsed.hostname.includes('pathofexile.com')) {
    throw new Error('La URL debe ser de pathofexile.com')
  }

  const path = parsed.pathname

  // POE2: /trade2/search/poe2/{league}/{queryId}
  const poe2Match = path.match(/^\/trade2\/search\/poe2\/([^/]+)\/([a-zA-Z0-9]+)$/)
  if (poe2Match) {
    return { game: 'poe2', league: decodeURIComponent(poe2Match[1]), queryId: poe2Match[2] }
  }

  // POE1: /trade/search/{league}/{queryId}
  const poe1Match = path.match(/^\/trade\/search\/([^/]+)\/([a-zA-Z0-9]+)$/)
  if (poe1Match) {
    return { game: 'poe1', league: decodeURIComponent(poe1Match[1]), queryId: poe1Match[2] }
  }

  throw new Error('Formato de URL no reconocido. Usa una URL de pathofexile.com/trade/search/...')
}
