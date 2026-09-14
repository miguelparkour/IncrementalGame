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
  return getCurrentTool(state)?.cansPerClick ?? 0
}

export function getSaleValue(cans: Amount): Amount | null {
  return isAmount(cans) ? multiplyAmounts(cans, GAME_CONFIG.canSalePrice) : null
}

export function canBuyTool(state: GameState): boolean {
  const nextTool = getNextTool(state)
  return nextTool !== undefined && state.money >= nextTool.cost
}

export function canCollect(state: GameState): boolean {
  const perClick = getCansPerClick(state)
  const newCans = addAmounts(state.cans, perClick)
  // Keep the whole inventory sellable at the current numeric limit.
  return perClick > 0 && newCans !== null && getSaleValue(newCans) !== null
}

export function canSell(state: GameState): boolean {
  const revenue = getSaleValue(state.cans)
  return state.cans > 0 && revenue !== null && addAmounts(state.money, revenue) !== null
}
