import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './config'
import { canCollect, canSell, getCapacity, getCansPerClick, getCollectionAmount, getSaleValue } from './economy'
import { advanceGame, applyCommand } from './engine'
import { createInitialState, type GameState } from './state'

const withTool = (): GameState => applyCommand({ ...createInitialState(), money: 100 }, { type: 'buy-tool' })

describe('manual business loop', () => {
  it('starts with no money, no cans, no tool and no achievements', () => {
    expect(createInitialState()).toEqual({
      money: 0, cans: 0, toolLevel: 0, achievements: [],
      batOwned: false, vagabonds: 0, recruitHits: 0, productionRemainder: 0,
    })
  })

  it('buys the first tool for exactly one dollar without mutating the old state', () => {
    const before = Object.freeze({ ...createInitialState(), money: 100 })
    expect(applyCommand(before, { type: 'buy-tool' })).toMatchObject({ money: 0, cans: 0, toolLevel: 1 })
    expect(before.money).toBe(100)
  })

  it('can collect by hand before owning a tool', () => {
    const state = createInitialState()
    expect(canCollect(state)).toBe(true)
    expect(applyCommand(state, { type: 'collect' }).cans).toBe(1)
  })

  it('collects one can per click and stores it without generating money', () => {
    const first = applyCommand(withTool(), { type: 'collect' })
    const second = applyCommand(first, { type: 'collect' })
    expect(first.cans).toBe(1)
    expect(second).toMatchObject({ money: 0, cans: 2, toolLevel: 1 })
  })

  it('buys the upgrade with sufficient money and increases collection', () => {
    const before = { ...withTool(), money: 525, cans: 3 }
    const upgraded = applyCommand(before, { type: 'buy-tool' })
    expect(upgraded).toMatchObject({ money: 25, cans: 3, toolLevel: 2 })
    expect(getCansPerClick(upgraded)).toBe(2)
    expect(getCapacity(upgraded)).toBe(20)
    expect(applyCommand(upgraded, { type: 'collect' }).cans).toBe(5)
  })

  it('accepts the exact upgrade price', () => {
    const state = { ...withTool(), money: 500 }
    expect(applyCommand(state, { type: 'buy-tool' }).money).toBe(0)
  })

  it.each([
    { money: 99, cans: 0, toolLevel: 0 },
    { money: 499, cans: 0, toolLevel: 1 },
    { money: 1999, cans: 20, toolLevel: 2 },
  ])('blocks a purchase with insufficient funds: %j', (fields) => {
    const state = { ...createInitialState(), ...fields }
    expect(applyCommand(state, { type: 'buy-tool' })).toBe(state)
  })

  it('cannot purchase past the last available upgrade', () => {
    const state = { ...createInitialState(), money: 100_000, toolLevel: GAME_CONFIG.toolUpgrades.length }
    expect(applyCommand(state, { type: 'buy-tool' })).toBe(state)
  })

  it.each([[0, 0], [1, 10], [3, 30], [50, 500], [100, 1000]])('values %i cans at %i cents', (cans, cents) => {
    expect(getSaleValue(cans)).toBe(cents)
  })

  it('sells the full inventory, adds its value and prevents double selling', () => {
    const before = Object.freeze({ ...createInitialState(), money: 125, cans: 3, toolLevel: 1 })
    const after = applyCommand(before, { type: 'sell' })
    expect(after).toMatchObject({ money: 155, cans: 0, toolLevel: 1 })
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

  it('progresses from empty hands to a stick and then a bag through repeated trips', () => {
    let state = createInitialState()
    for (let trip = 0; trip < 5; trip++) {
      for (let click = 0; click < 2; click++) state = applyCommand(state, { type: 'collect' })
      state = applyCommand(state, { type: 'sell' })
    }
    state = applyCommand(state, { type: 'buy-tool' })
    expect(state).toMatchObject({ money: 0, cans: 0, toolLevel: 1 })
    for (let trip = 0; trip < 10; trip++) {
      for (let click = 0; click < 5; click++) state = applyCommand(state, { type: 'collect' })
      state = applyCommand(state, { type: 'sell' })
    }
    state = applyCommand(state, { type: 'buy-tool' })
    expect(state).toMatchObject({ money: 0, cans: 0, toolLevel: 2 })
  })

  it.each([[0, 2], [1, 5], [2, 20], [3, 100]])('enforces capacity %i → %i through repeated clicks', (toolLevel, capacity) => {
    let state: GameState = { ...createInitialState(), toolLevel }
    expect(getCapacity(state)).toBe(capacity)
    for (let i = 0; i <= capacity; i++) state = applyCommand(state, { type: 'collect' })
    expect(state.cans).toBe(capacity)
    expect(canCollect(state)).toBe(false)
    expect(applyCommand(state, { type: 'collect' })).toBe(state)
    const sold = applyCommand(state, { type: 'sell' })
    expect(sold.cans).toBe(0)
    expect(canCollect(sold)).toBe(true)
  })

  it.each([[2, 20], [3, 100]])('collects only what fits for level %i with capacity %i', (toolLevel, capacity) => {
    const state = { ...createInitialState(), toolLevel, cans: capacity - 1 }
    expect(getCollectionAmount(state)).toBe(1)
    expect(applyCommand(state, { type: 'collect' }).cans).toBe(capacity)
  })

  it.each([2000, 2050])('buys a cart for $20 with %i cents, preserving cans and collection speed', (money) => {
    const before = { ...createInitialState(), money, toolLevel: 2, cans: 20 }
    expect(canCollect(before)).toBe(false)
    const purchased = applyCommand(before, { type: 'buy-tool' })
    expect(purchased).toMatchObject({ money: money - 2000, toolLevel: 3, cans: 20 })
    expect(getCapacity(purchased)).toBe(100)
    expect(getCansPerClick(purchased)).toBe(getCansPerClick(before))
    expect(applyCommand(purchased, { type: 'collect' }).cans).toBe(22)
    expect(before).toMatchObject({ money, toolLevel: 2, cans: 20 })
  })

  it('increases capacity immediately without losing carried cans', () => {
    const state = { ...createInitialState(), money: 100, cans: 2 }
    expect(canCollect(state)).toBe(false)
    const purchased = applyCommand(state, { type: 'buy-tool' })
    expect(purchased.cans).toBe(2)
    expect(getCapacity(purchased)).toBe(5)
    expect(canCollect(purchased)).toBe(true)
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
