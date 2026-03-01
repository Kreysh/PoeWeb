export interface BuildArchetype {
  id: string
  name: string
  game: 'poe1' | 'poe2' | 'both'
  desiredMods: RegExp[]
  weights: Record<string, number>
}

export const ARCHETYPES: BuildArchetype[] = [
  {
    id: 'phys-melee',
    name: 'Physical Melee',
    game: 'both',
    desiredMods: [
      /adds \d+ to \d+ physical damage/i,
      /increased physical damage/i,
      /increased attack speed/i,
      /to accuracy rating/i,
      /increased critical strike chance/i,
      /to maximum life/i,
      /to (fire|cold|lightning) resistance/i,
    ],
    weights: { 'physical damage': 2, 'attack speed': 1.5, life: 1.3, resistance: 1 },
  },
  {
    id: 'spell-caster',
    name: 'Spell Caster',
    game: 'both',
    desiredMods: [
      /increased spell damage|to spell damage/i,
      /increased cast speed/i,
      /to spell critical strike chance/i,
      /to level of.*gems/i,
      /to maximum mana/i,
      /to maximum life/i,
      /to (fire|cold|lightning) resistance/i,
    ],
    weights: { 'spell damage': 2, 'cast speed': 1.5, 'gem level': 2, life: 1.3 },
  },
  {
    id: 'minion',
    name: 'Minion/Summoner',
    game: 'poe1',
    desiredMods: [
      /minions deal.*increased damage/i,
      /to level of all minion skill gems/i,
      /minions have.*increased (attack|cast) speed/i,
      /to maximum life/i,
      /to (fire|cold|lightning) resistance/i,
    ],
    weights: { 'minion damage': 2, 'minion gem level': 2, life: 1.5, resistance: 1 },
  },
  {
    id: 'bow-ranged',
    name: 'Bow/Ranged',
    game: 'both',
    desiredMods: [
      /adds \d+ to \d+ (physical|cold|lightning|fire) damage/i,
      /increased attack speed/i,
      /to weapon critical strike chance/i,
      /increased critical strike chance/i,
      /increased projectile speed/i,
      /to maximum life/i,
    ],
    weights: { 'elemental damage': 1.5, 'attack speed': 1.5, 'crit chance': 1.8, life: 1.3 },
  },
  {
    id: 'dot',
    name: 'Damage over Time',
    game: 'poe1',
    desiredMods: [
      /increased damage over time/i,
      /to chaos damage over time multiplier/i,
      /increased chaos damage/i,
      /to level of.*chaos.*gems/i,
      /to maximum life/i,
      /to (fire|cold|lightning|chaos) resistance/i,
    ],
    weights: { 'dot multiplier': 2, 'chaos damage': 1.5, 'gem level': 2, life: 1.3 },
  },
  {
    id: 'poe2-warrior',
    name: 'Warrior',
    game: 'poe2',
    desiredMods: [
      /adds \d+ to \d+ physical damage/i,
      /increased physical damage/i,
      /increased attack speed/i,
      /to armour/i,
      /to maximum life/i,
      /to (fire|cold|lightning) resistance/i,
    ],
    weights: { 'physical damage': 2, 'attack speed': 1.5, armour: 1.2, life: 1.5 },
  },
  {
    id: 'poe2-sorceress',
    name: 'Sorceress',
    game: 'poe2',
    desiredMods: [
      /increased spell damage|to spell damage/i,
      /increased cast speed/i,
      /to maximum energy shield/i,
      /to maximum mana/i,
      /to intelligence/i,
    ],
    weights: { 'spell damage': 2, 'cast speed': 1.5, 'energy shield': 1.5, mana: 1.2 },
  },
  {
    id: 'poe2-ranger',
    name: 'Ranger',
    game: 'poe2',
    desiredMods: [
      /adds \d+ to \d+ (physical|cold|lightning) damage/i,
      /increased attack speed/i,
      /to evasion rating/i,
      /increased critical strike chance/i,
      /to maximum life/i,
    ],
    weights: { 'attack damage': 1.5, 'attack speed': 1.5, evasion: 1.3, 'crit chance': 1.8 },
  },
  {
    id: 'poe2-monk',
    name: 'Monk',
    game: 'poe2',
    desiredMods: [
      /increased attack speed/i,
      /adds \d+ to \d+ (physical|lightning) damage/i,
      /to evasion rating/i,
      /increased critical strike chance/i,
      /to maximum life/i,
    ],
    weights: { 'attack speed': 2, 'physical damage': 1.5, evasion: 1.2, life: 1.5 },
  },
  {
    id: 'poe2-witch',
    name: 'Witch',
    game: 'poe2',
    desiredMods: [
      /increased spell damage|to spell damage/i,
      /to level of.*gems/i,
      /to maximum energy shield/i,
      /increased chaos damage/i,
      /minions deal.*increased damage/i,
    ],
    weights: { 'spell damage': 2, 'gem level': 2, 'energy shield': 1.3, 'chaos damage': 1.5 },
  },
]
