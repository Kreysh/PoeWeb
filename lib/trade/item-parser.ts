import type { TradeItemListing, ParsedItem, ParsedMod } from './types'
import { parseItemStats } from './stats-parser'

export function parseItemListing(listing: TradeItemListing): ParsedItem {
  const { item, listing: meta } = listing

  const mods: ParsedMod[] = []

  // Parse explicit mods
  if (item.explicitMods) {
    const extMods = item.extended?.mods?.explicit || []
    item.explicitMods.forEach((text, i) => {
      const extMod = extMods[i]
      mods.push({
        text,
        type: 'explicit',
        tier: extMod?.tier || null,
        tierNum: extMod?.tier ? parseTierNumber(extMod.tier) : null,
        level: extMod?.level || null,
        magnitudes: extMod?.magnitudes || [],
      })
    })
  }

  // Parse implicit mods
  if (item.implicitMods) {
    const extMods = item.extended?.mods?.implicit || []
    item.implicitMods.forEach((text, i) => {
      const extMod = extMods[i]
      mods.push({
        text,
        type: 'implicit',
        tier: extMod?.tier || null,
        tierNum: extMod?.tier ? parseTierNumber(extMod.tier) : null,
        level: extMod?.level || null,
        magnitudes: extMod?.magnitudes || [],
      })
    })
  }

  // Parse crafted mods
  if (item.craftedMods) {
    const extMods = item.extended?.mods?.crafted || []
    item.craftedMods.forEach((text, i) => {
      const extMod = extMods[i]
      mods.push({
        text,
        type: 'crafted',
        tier: extMod?.tier || 'crafted',
        tierNum: null,
        level: extMod?.level || null,
        magnitudes: extMod?.magnitudes || [],
      })
    })
  }

  // Parse fractured mods
  if (item.fracturedMods) {
    const extMods = item.extended?.mods?.fractured || []
    item.fracturedMods.forEach((text, i) => {
      const extMod = extMods[i]
      mods.push({
        text,
        type: 'fractured',
        tier: extMod?.tier || 'fractured',
        tierNum: extMod?.tier ? parseTierNumber(extMod.tier) : null,
        level: extMod?.level || null,
        magnitudes: extMod?.magnitudes || [],
      })
    })
  }

  // Parse enchant mods
  if (item.enchantMods) {
    item.enchantMods.forEach((text) => {
      mods.push({ text, type: 'enchant', tier: null, tierNum: null, level: null, magnitudes: [] })
    })
  }

  // Calculate sockets
  let totalSockets = 0
  let maxLinks = 0
  let socketColors = ''
  if (item.sockets) {
    totalSockets = item.sockets.length
    const groups: Record<number, number> = {}
    item.sockets.forEach((s) => {
      groups[s.group] = (groups[s.group] || 0) + 1
      socketColors += s.sColour
    })
    maxLinks = Math.max(0, ...Object.values(groups))
  }

  const influences = item.influences ? Object.keys(item.influences).filter(k => item.influences![k]) : []

  const rarity = item.rarity?.toLowerCase() || 'normal'
  const mappedProps = (item.properties || []).map(p => ({
    name: p.name,
    values: p.values.map(v => v[0]),
  }))
  const stats = parseItemStats(mappedProps, item.category || null, mods, rarity)

  return {
    id: listing.id,
    name: item.name || '',
    typeLine: item.typeLine || '',
    baseType: item.baseType || item.typeLine || '',
    rarity,
    ilvl: item.ilvl || 0,
    icon: item.icon || '',
    corrupted: item.corrupted || false,
    fractured: item.fractured || false,
    synthesised: item.synthesised || false,
    influences,
    price: meta.price ? { amount: meta.price.amount, currency: meta.price.currency } : null,
    seller: {
      account: meta.account.name,
      character: meta.account.lastCharacterName,
      online: !!meta.account.online,
    },
    whisper: meta.whisper,
    whisperToken: meta.whisper_token,
    indexedAt: meta.indexed,
    mods,
    properties: mappedProps,
    sockets: { total: totalSockets, links: maxLinks, colors: socketColors },
    stats,
  }
}

function parseTierNumber(tier: string): number | null {
  const match = tier.match(/[SPp](\d+)/)
  if (match) return parseInt(match[1], 10)
  return null
}

export function parseSearchResults(listings: TradeItemListing[]): ParsedItem[] {
  return listings.map(parseItemListing)
}
