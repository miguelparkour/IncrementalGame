import { addAmounts } from './amount'
import {
  canBuyTool,
  canCollect,
  canSell,
  getCansPerClick,
  getNextTool,
  getSaleValue,
} from './economy'
import type { GameState } from './state'

export type GameCommand =
  | { type: 'buy-tool' }
  | { type: 'collect' }
  | { type: 'sell' }

/** Pure transitions. Invalid actions return the same state without side effects. */
export function applyCommand(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case 'buy-tool': {
      const tool = getNextTool(state)
      if (!tool || !canBuyTool(state)) return state

      return { ...state, money: state.money - tool.cost, toolLevel: state.toolLevel + 1 }
    }
    case 'collect': {
      if (!canCollect(state)) return state
      const cans = addAmounts(state.cans, getCansPerClick(state))
      return cans === null ? state : { ...state, cans }
    }
    case 'sell': {
      const revenue = getSaleValue(state.cans)
      if (revenue === null || !canSell(state)) return state
      const money = addAmounts(state.money, revenue)
      return money === null ? state : { ...state, money, cans: 0 }
    }
  }
}

/**
 * Shared entry point for future online and offline production.
 * Call with elapsed milliseconds, never with a count of frames or timer ticks.
 * Working alone produces nothing passively, however much time passes.
 */
export function advanceGame(state: GameState, elapsedMs: number): GameState {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return state
  return state
}
