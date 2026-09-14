import { addAmounts, isAmount, multiplyAmounts, type Amount } from './amount'
import { GAME_CONFIG, type ToolUpgrade } from './config'
import type { GameState } from './state'

export function getCurrentTool(state: GameState): ToolUpgrade | undefined {
  return GAME_CONFIG.toolUpgrades[state.toolLevel - 1]
}

export function getNextTool(state: GameState): ToolUpgrade | undefined {
  return GAME_CONFIG.toolUpgrades[state.toolLevel]
}

export function getCansPerClick(state: GameState): Amount {
  return getCurrentTool(state)?.cansPerClick ?? GAME_CONFIG.hands.cansPerClick
}

export function getCapacity(state: GameState): Amount {
  return getCurrentTool(state)?.capacity ?? GAME_CONFIG.hands.capacity
}

/** The last click collects only what fits. Legacy overflow must be sold first. */
export function getCollectionAmount(state: GameState): Amount {
  return Math.min(getCansPerClick(state), Math.max(0, getCapacity(state) - state.cans))
}

export function getSaleValue(cans: Amount): Amount | null {
  return isAmount(cans) ? multiplyAmounts(cans, GAME_CONFIG.canSalePrice) : null
}

export function canBuyTool(state: GameState): boolean {
  const nextTool = getNextTool(state)
  return nextTool !== undefined && state.money >= nextTool.cost
}

export function canCollect(state: GameState): boolean {
  const perClick = getCollectionAmount(state)
  const newCans = addAmounts(state.cans, perClick)
  // Keep the whole inventory sellable at the current numeric limit.
  return perClick > 0 && newCans !== null && getSaleValue(newCans) !== null
}

export function canSell(state: GameState): boolean {
  const revenue = getSaleValue(state.cans)
  return state.cans > 0 && revenue !== null && addAmounts(state.money, revenue) !== null
}
