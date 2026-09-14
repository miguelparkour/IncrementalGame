import type { GameState } from './state'
import { GAME_CONFIG } from './config'

export const ACHIEVEMENTS = [
  {
    id: 'first-can',
    name: 'La primera lata',
    description: 'Recoge tu primera lata.',
    isCompleted: (_before: GameState, after: GameState) => after.cans > 0,
  },
  {
    id: 'full-hands',
    name: 'Las dos manos ocupadas',
    description: 'Lleva dos latas en las manos a la vez.',
    isCompleted: (_before: GameState, after: GameState) =>
      after.toolLevel === 0 && after.cans >= GAME_CONFIG.hands.capacity,
  },
  {
    id: 'first-sale',
    name: 'Mis primeros ingresos',
    description: 'Vende latas por primera vez.',
    isCompleted: (before: GameState, after: GameState) =>
      before.cans > 0 && after.cans === 0 && after.money > before.money,
  },
  {
    id: 'first-tool',
    name: 'Una pequeña inversión',
    description: 'Compra tu primer palo.',
    isCompleted: (_before: GameState, after: GameState) => after.toolLevel >= 1,
  },
  {
    id: 'bag-tool',
    name: 'Un poco más de espacio',
    description: 'Mejora el palo a palo con bolsa.',
    isCompleted: (_before: GameState, after: GameState) => after.toolLevel >= 2,
  },
  {
    id: 'full-bag',
    name: 'La bolsa llena',
    description: 'Llena la bolsa con veinte latas.',
    isCompleted: (_before: GameState, after: GameState) =>
      after.toolLevel >= 2 && after.cans >= GAME_CONFIG.toolUpgrades[1].capacity,
  },
] as const

export type AchievementId = typeof ACHIEVEMENTS[number]['id']

export function isAchievementId(value: unknown): value is AchievementId {
  return ACHIEVEMENTS.some((achievement) => achievement.id === value)
}

/** Completed achievements are permanent until reset and have no economic effects. */
export function unlockAchievements(state: GameState, previous: GameState = state): GameState {
  const unlocked = ACHIEVEMENTS.filter((achievement) =>
    !state.achievements.includes(achievement.id) && achievement.isCompleted(previous, state),
  ).map((achievement) => achievement.id)

  return unlocked.length === 0 ? state : { ...state, achievements: [...state.achievements, ...unlocked] }
}
