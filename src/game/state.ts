import { isAmount, type Amount } from './amount'
import { GAME_CONFIG } from './config'

export interface GameState {
  readonly money: Amount
  readonly cans: Amount
  readonly toolLevel: number
}

export function createInitialState(): GameState {
  return { money: GAME_CONFIG.startingMoney, cans: 0, toolLevel: 0 }
}

export function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false

  return (
    'money' in value && isAmount(value.money) &&
    'cans' in value && isAmount(value.cans) &&
    'toolLevel' in value && isAmount(value.toolLevel) &&
    value.toolLevel <= GAME_CONFIG.toolUpgrades.length
  )
}
