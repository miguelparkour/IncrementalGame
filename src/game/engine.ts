import { addAmounts } from './amount'
import { unlockAchievements } from './achievements'
import { GAME_CONFIG } from './config'
import { advanceProduction } from './production'
import { canBuyBat, canHitVagabond } from './vagabonds'
import {
  canBuyTool,
  canCollect,
  canSell,
  getCapacity,
  getCollectionAmount,
  getNextTool,
  getSaleValue,
} from './economy'
import type { GameState } from './state'

export type GameCommand =
  | { type: 'buy-tool' }
  | { type: 'collect' }
  | { type: 'sell' }
  | { type: 'buy-bat' }
  | { type: 'hit-vagabond' }

/** Pure transitions. Invalid actions return the same state without side effects. */
export function applyCommand(state: GameState, command: GameCommand): GameState {
  const next = transition(state, command)
  return next === state ? state : unlockAchievements(next, state)
}

function transition(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case 'buy-tool': {
      const tool = getNextTool(state)
      if (!tool || !canBuyTool(state)) return state

      return { ...state, money: state.money - tool.cost, toolLevel: state.toolLevel + 1 }
    }
    case 'collect': {
      if (!canCollect(state)) return state
      const cans = addAmounts(state.cans, getCollectionAmount(state))
      return cans === null ? state : {
        ...state, cans,
        productionRemainder: cans >= getCapacity(state) ? 0 : state.productionRemainder,
      }
    }
    case 'sell': {
      const revenue = getSaleValue(state.cans)
      if (revenue === null || !canSell(state)) return state
      const money = addAmounts(state.money, revenue)
      return money === null ? state : { ...state, money, cans: 0 }
    }
    case 'buy-bat': {
      if (!canBuyBat(state)) return state
      return { ...state, money: state.money - GAME_CONFIG.bat.cost, batOwned: true }
    }
    case 'hit-vagabond': {
      if (!canHitVagabond(state)) return state
      const recruitHits = state.recruitHits + 1
      if (recruitHits < GAME_CONFIG.vagabonds.hitsRequired) return { ...state, recruitHits }
      return {
        ...state,
        money: state.money - GAME_CONFIG.vagabonds.recruitmentCost,
        vagabonds: state.vagabonds + 1,
        recruitHits: 0,
      }
    }
  }
}

/**
 * Shared entry point for online and offline production.
 * Call with elapsed milliseconds, never with a count of frames or timer ticks.
 * Working alone produces nothing passively, however much time passes.
 */
export function advanceGame(state: GameState, elapsedMs: number): GameState {
  const next = advanceProduction(state, elapsedMs)
  return next === state ? state : unlockAchievements(next, state)
}
