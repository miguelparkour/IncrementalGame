import { isAmount, type Amount } from './amount'
import { GAME_CONFIG } from './config'
import { isAchievementId, type AchievementId } from './achievements'

export interface GameState {
  readonly money: Amount
  readonly cans: Amount
  readonly toolLevel: number
  readonly achievements: readonly AchievementId[]
  readonly batOwned: boolean
  readonly vagabonds: number
  readonly recruitHits: number
  /** Thousandths of a can already produced, carried between time advances. */
  readonly productionRemainder: number
}

export function createInitialState(): GameState {
  return {
    money: GAME_CONFIG.startingMoney, cans: 0, toolLevel: 0, achievements: [],
    batOwned: false, vagabonds: 0, recruitHits: 0, productionRemainder: 0,
  }
}

export function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false

  return (
    'money' in value && isAmount(value.money) &&
    'cans' in value && isAmount(value.cans) &&
    'toolLevel' in value && isAmount(value.toolLevel) &&
    value.toolLevel <= GAME_CONFIG.toolUpgrades.length &&
    'achievements' in value && Array.isArray(value.achievements) &&
    value.achievements.every(isAchievementId) &&
    new Set(value.achievements).size === value.achievements.length &&
    'batOwned' in value && typeof value.batOwned === 'boolean' &&
    'vagabonds' in value && isAmount(value.vagabonds) && value.vagabonds <= GAME_CONFIG.vagabonds.maxCount &&
    'recruitHits' in value && isAmount(value.recruitHits) && value.recruitHits < GAME_CONFIG.vagabonds.hitsRequired &&
    'productionRemainder' in value && isAmount(value.productionRemainder) && value.productionRemainder < 1000 &&
    (value.batOwned || (value.vagabonds === 0 && value.recruitHits === 0)) &&
    (value.vagabonds > 0 || value.productionRemainder === 0) &&
    (value.vagabonds < GAME_CONFIG.vagabonds.maxCount || value.recruitHits === 0)
  )
}
