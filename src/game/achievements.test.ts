import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from './achievements'
import { applyCommand } from './engine'
import { createInitialState, type GameState } from './state'

describe('permanent achievements', () => {
  it('awards first collection, full hands and first sale without extra income', () => {
    const initial = createInitialState()
    const first = applyCommand(initial, { type: 'collect' })
    expect(first.achievements).toEqual(['first-can'])
    const full = applyCommand(first, { type: 'collect' })
    expect(full.achievements).toEqual(['first-can', 'full-hands'])
    const sold = applyCommand(full, { type: 'sell' })
    expect(sold.achievements).toEqual(['first-can', 'full-hands', 'first-sale'])
    expect(sold.money).toBe(20)
    expect(initial.achievements).toEqual([])
    expect(first.achievements).toEqual(['first-can'])
  })

  it('unlocks both tool achievements and full bag, without awarding full hands', () => {
    let state: GameState = { ...createInitialState(), money: 600 }
    state = applyCommand(state, { type: 'buy-tool' })
    expect(state.achievements).toEqual(['first-tool'])
    state = applyCommand(state, { type: 'buy-tool' })
    expect(state.achievements).toEqual(['first-tool', 'bag-tool'])
    for (let i = 0; i < 9; i++) state = applyCommand(state, { type: 'collect' })
    expect(state.achievements).not.toContain('full-bag')
    state = applyCommand(state, { type: 'collect' })
    expect(state.achievements).toContain('full-bag')
    expect(state.achievements).not.toContain('full-hands')
    expect(state.money).toBe(0)
  })

  it('never duplicates achievements when the same milestone repeats', () => {
    let state = createInitialState()
    for (let i = 0; i < 5; i++) {
      state = applyCommand(state, { type: 'collect' })
      state = applyCommand(state, { type: 'collect' })
      state = applyCommand(state, { type: 'sell' })
    }
    state = applyCommand(state, { type: 'buy-tool' })
    expect(state.achievements).toEqual(['first-can', 'full-hands', 'first-sale', 'first-tool'])
  })

  it('awards nothing for rejected actions', () => {
    const state = createInitialState()
    expect(applyCommand(state, { type: 'sell' })).toBe(state)
    expect(applyCommand(state, { type: 'buy-tool' })).toBe(state)
    expect(state.achievements).toEqual([])
  })

  it('still allows completing the full-bag achievement after buying the cart', () => {
    const state = { ...createInitialState(), money: 2000, toolLevel: 2, cans: 18 }
    const withCart = applyCommand(state, { type: 'buy-tool' })
    expect(withCart.achievements).not.toContain('full-bag')
    expect(applyCommand(withCart, { type: 'collect' }).achievements).toContain('full-bag')
  })

  it('uses unique stable achievement IDs', () => {
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(ACHIEVEMENTS.length)
  })
})
