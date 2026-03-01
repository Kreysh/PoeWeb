export interface ModTier {
  id: number
  game: string
  modId: string
  internalName: string | null
  displayName: string
  generationType: string | null
  domain: string | null
  tier: number | null
  requiredLevel: number | null
  spawnWeight: number | null
  modGroup: string | null
  modCategory: string | null
  influence: string | null
  stats: ModStat[]
  applicableTags: string[]
  patchVersion: string | null
}

export interface ModStat {
  id: string
  min: number
  max: number
}

export interface ModMatch {
  modTier: ModTier | null
  tier: number
  tierLabel: string
  rollQuality: number
  isTop: boolean
}

export interface ModDatabase {
  findByText(text: string, game: string): ModMatch | null
  findByModId(modId: string, game: string): ModTier | null
}
