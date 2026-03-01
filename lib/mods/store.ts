import { getDb } from '@/lib/db'
import type { ModTier } from './types'

export function getModTier(game: string, modId: string): ModTier | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM mod_tiers WHERE game = ? AND mod_id = ?').get(game, modId) as any
  if (!row) return null
  return rowToModTier(row)
}

export function searchMods(game: string, query: string, limit = 20): ModTier[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM mod_tiers WHERE game = ? AND display_name LIKE ? LIMIT ?').all(game, `%${query}%`, limit) as any[]
  return rows.map(rowToModTier)
}

export function getModsByCategory(game: string, category: string): ModTier[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM mod_tiers WHERE game = ? AND mod_category = ? ORDER BY tier ASC').all(game, category) as any[]
  return rows.map(rowToModTier)
}

export function upsertModTier(mod: Omit<ModTier, 'id'>): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO mod_tiers (game, mod_id, internal_name, display_name, generation_type, domain, tier, required_level, spawn_weight, mod_group, mod_category, influence, stats_json, applicable_tags_json, patch_version, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game, mod_id) DO UPDATE SET
      display_name = excluded.display_name,
      tier = excluded.tier,
      required_level = excluded.required_level,
      spawn_weight = excluded.spawn_weight,
      mod_group = excluded.mod_group,
      mod_category = excluded.mod_category,
      stats_json = excluded.stats_json,
      updated_at = datetime('now')
  `).run(
    mod.game, mod.modId, mod.internalName, mod.displayName, mod.generationType,
    mod.domain, mod.tier, mod.requiredLevel, mod.spawnWeight, mod.modGroup,
    mod.modCategory, mod.influence, JSON.stringify(mod.stats),
    JSON.stringify(mod.applicableTags), mod.patchVersion
  )
}

export function getModCount(game: string): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM mod_tiers WHERE game = ?').get(game) as { count: number }
  return row.count
}

function rowToModTier(row: any): ModTier {
  return {
    id: row.id,
    game: row.game,
    modId: row.mod_id,
    internalName: row.internal_name,
    displayName: row.display_name,
    generationType: row.generation_type,
    domain: row.domain,
    tier: row.tier,
    requiredLevel: row.required_level,
    spawnWeight: row.spawn_weight,
    modGroup: row.mod_group,
    modCategory: row.mod_category,
    influence: row.influence,
    stats: safeParseJson(row.stats_json, []),
    applicableTags: safeParseJson(row.applicable_tags_json, []),
    patchVersion: row.patch_version,
  }
}

function safeParseJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) } catch { return fallback }
}
