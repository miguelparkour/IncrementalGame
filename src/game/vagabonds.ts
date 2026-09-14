import { GAME_CONFIG } from './config'
import type { GameState } from './state'

export function canBuyBat(state: GameState): boolean {
  return !state.batOwned && state.money >= GAME_CONFIG.bat.cost
}

export function canHitVagabond(state: GameState): boolean {
  if (!state.batOwned || state.vagabonds >= GAME_CONFIG.vagabonds.maxCount) return false
  return state.recruitHits < GAME_CONFIG.vagabonds.hitsRequired - 1 ||
    state.money >= GAME_CONFIG.vagabonds.recruitmentCost
}

export function getPassiveCansPerSecond(state: GameState): number {
  return state.vagabonds * GAME_CONFIG.vagabonds.cansPerSecond
}
