import { getCapacity } from './economy'
import type { GameState } from './state'
import { getPassiveCansPerSecond } from './vagabonds'

/** Exact production for integer milliseconds; the same function serves offline play. */
export function advanceProduction(state: GameState, elapsedMs: number): GameState {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs <= 0) return state
  const rate = getPassiveCansPerSecond(state)
  if (rate === 0) return state

  const space = Math.max(0, getCapacity(state) - state.cans)
  if (space === 0) {
    return state.productionRemainder === 0 ? state : { ...state, productionRemainder: 0 }
  }

  // Limit elapsed time before multiplying: long absences cannot overflow and
  // time spent at full capacity never becomes a stockpile of future production.
  const timeToFill = Math.ceil((space * 1000 - state.productionRemainder) / rate)
  const produced = Math.min(elapsedMs, timeToFill) * rate + state.productionRemainder
  const gained = Math.min(space, Math.floor(produced / 1000))
  return {
    ...state,
    cans: state.cans + gained,
    productionRemainder: gained === space ? 0 : produced % 1000,
  }
}
