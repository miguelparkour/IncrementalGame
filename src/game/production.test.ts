import { describe, expect, it } from 'vitest'
import { advanceGame, applyCommand } from './engine'
import { createInitialState, type GameState } from './state'

const withProducers = (): GameState => ({
  ...createInitialState(), toolLevel: 3, batOwned: true, vagabonds: 1,
  achievements: ['first-tool', 'bag-tool'],
})

describe('production by elapsed time', () => {
  it.each([1, 3, 10])('generates %i cans per second', (vagabonds) => {
    const state = { ...withProducers(), vagabonds }
    expect(advanceGame(state, 1000)).toMatchObject({ cans: vagabonds, money: 0, productionRemainder: 0 })
    expect(state.cans).toBe(0)
  })

  it('preserves fractional progress rather than rounding each update', () => {
    const first = advanceGame(withProducers(), 375)
    expect(first).toMatchObject({ cans: 0, productionRemainder: 375 })
    expect(advanceGame(first, 625)).toMatchObject({ cans: 1, productionRemainder: 0 })
  })

  it.each([1, 3, 10])('is independent of update frequency for %i producers', (vagabonds) => {
    const state = { ...withProducers(), vagabonds }
    let split = state
    for (let i = 0; i < 137; i++) split = advanceGame(split, 13)
    expect(split).toEqual(advanceGame(state, 137 * 13))
  })

  it.each([[0, 2], [1, 5], [2, 20], [3, 100]])('respects level %i capacity %i on long absences', (toolLevel, capacity) => {
    const full = advanceGame({ ...withProducers(), toolLevel, vagabonds: 10 }, Number.MAX_SAFE_INTEGER)
    expect(full).toMatchObject({ cans: capacity, money: 0, productionRemainder: 0 })
    expect(advanceGame(full, 100_000)).toBe(full)
  })

  it('does not bank production while full', () => {
    const full = advanceGame(withProducers(), 86_400_000)
    const sold = applyCommand(full, { type: 'sell' })
    expect(advanceGame(sold, 500)).toMatchObject({ cans: 0, productionRemainder: 500 })
  })

  it('shares space with manual collection and drops fractions when the last slot fills', () => {
    const partial = { ...withProducers(), cans: 99, productionRemainder: 500 }
    const full = applyCommand(partial, { type: 'collect' })
    expect(full).toMatchObject({ cans: 100, productionRemainder: 0 })
    const sold = applyCommand(full, { type: 'sell' })
    expect(advanceGame(sold, 500).cans).toBe(0)
  })

  it('keeps earned fractional work when selling before capacity is full', () => {
    const sold = applyCommand({ ...withProducers(), cans: 10, productionRemainder: 500 }, { type: 'sell' })
    expect(advanceGame(sold, 500)).toMatchObject({ cans: 1, money: 100, productionRemainder: 0 })
  })

  it('can unlock collection achievements through passive production', () => {
    const state = advanceGame({ ...withProducers(), toolLevel: 2 }, 20_000)
    expect(state.achievements).toContain('first-can')
    expect(state.achievements).toContain('full-bag')
  })

  it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('ignores invalid or zero elapsed milliseconds: %s', (elapsed) => {
    const state = withProducers()
    expect(advanceGame(state, elapsed)).toBe(state)
  })
})
