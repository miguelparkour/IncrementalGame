import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './config'
import { canCollect, canSell, getCansPerClick, getSaleValue } from './economy'
import { advanceGame, applyCommand } from './engine'
import { createInitialState, type GameState } from './state'

const withTool = (): GameState => applyCommand(createInitialState(), { type: 'buy-tool' })

describe('manual business loop', () => {
  it('starts with one dollar, no cans and no tool', () => {
    expect(createInitialState()).toEqual({ money: 100, cans: 0, toolLevel: 0 })
  })

  it('buys the first tool for exactly one dollar without mutating the old state', () => {
    const before = Object.freeze(createInitialState())
    expect(applyCommand(before, { type: 'buy-tool' })).toEqual({ money: 0, cans: 0, toolLevel: 1 })
    expect(before.money).toBe(100)
  })

  it('cannot collect before owning a tool', () => {
    const state = createInitialState()
    expect(canCollect(state)).toBe(false)
    expect(applyCommand(state, { type: 'collect' })).toBe(state)
  })

  it('collects one can per click and stores it without generating money', () => {
    const first = applyCommand(withTool(), { type: 'collect' })
    const second = applyCommand(first, { type: 'collect' })
    expect(first.cans).toBe(1)
    expect(second).toEqual({ money: 0, cans: 2, toolLevel: 1 })
  })

  it('buys the upgrade with sufficient money and increases collection', () => {
    const before = { ...withTool(), money: 525, cans: 3 }
    const upgraded = applyCommand(before, { type: 'buy-tool' })
    expect(upgraded).toEqual({ money: 25, cans: 3, toolLevel: 2 })
    expect(getCansPerClick(upgraded)).toBe(2)
    expect(applyCommand(upgraded, { type: 'collect' }).cans).toBe(5)
  })

  it('accepts the exact upgrade price', () => {
    const state = { ...withTool(), money: 500 }
    expect(applyCommand(state, { type: 'buy-tool' }).money).toBe(0)
  })

  it.each([
    { money: 99, cans: 0, toolLevel: 0 },
    { money: 499, cans: 0, toolLevel: 1 },
  ])('blocks a purchase with insufficient funds: %j', (state) => {
    expect(applyCommand(state, { type: 'buy-tool' })).toBe(state)
  })

  it('cannot purchase past the last available upgrade', () => {
    const state = { money: 100_000, cans: 0, toolLevel: GAME_CONFIG.toolUpgrades.length }
    expect(applyCommand(state, { type: 'buy-tool' })).toBe(state)
  })

  it.each([[0, 0], [1, 10], [3, 30], [50, 500]])('values %i cans at %i cents', (cans, cents) => {
    expect(getSaleValue(cans)).toBe(cents)
  })

  it('sells the full inventory, adds its value and prevents double selling', () => {
    const before = Object.freeze({ money: 125, cans: 3, toolLevel: 1 })
    const after = applyCommand(before, { type: 'sell' })
    expect(after).toEqual({ money: 155, cans: 0, toolLevel: 1 })
    expect(applyCommand(after, { type: 'sell' })).toBe(after)
    expect(before.cans).toBe(3)
  })

  it('keeps decimal-dollar sales exact across repeated transactions', () => {
    let state = withTool()
    for (let i = 0; i < 10; i++) {
      state = applyCommand(applyCommand(state, { type: 'collect' }), { type: 'sell' })
    }
    expect(state.money).toBe(100)
  })

  it('reaches the first improvement by collecting and selling 50 cans', () => {
    let state = withTool()
    for (let i = 0; i < 50; i++) state = applyCommand(state, { type: 'collect' })
    state = applyCommand(state, { type: 'sell' })
    state = applyCommand(state, { type: 'buy-tool' })
    expect(state).toEqual({ money: 0, cans: 0, toolLevel: 2 })
  })

  it('refuses an overflowing sale without destroying the inventory', () => {
    const state = { ...withTool(), money: Number.MAX_SAFE_INTEGER, cans: 1 }
    expect(canSell(state)).toBe(false)
    expect(applyCommand(state, { type: 'sell' })).toBe(state)
  })

  it('stops collection before the inventory value exceeds safe precision', () => {
    const state = { ...withTool(), cans: Math.floor(Number.MAX_SAFE_INTEGER / GAME_CONFIG.canSalePrice) }
    expect(canCollect(state)).toBe(false)
    expect(applyCommand(state, { type: 'collect' })).toBe(state)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 0, 1000, 86_400_000])(
    'does not grant passive resources for elapsed time %s', (elapsed) => {
      const state = withTool()
      expect(advanceGame(state, elapsed)).toBe(state)
    },
  )
})
