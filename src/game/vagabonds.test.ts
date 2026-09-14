import { describe, expect, it } from 'vitest'
import { applyCommand } from './engine'
import { getCapacity, getCansPerClick } from './economy'
import { createInitialState } from './state'
import { canBuyBat, canHitVagabond, getPassiveCansPerSecond } from './vagabonds'

describe('bat and vagabond recruitment', () => {
  it('buys the bat for $40 without changing collection or capacity', () => {
    const before = { ...createInitialState(), money: 4100, toolLevel: 3, cans: 17 }
    const after = applyCommand(before, { type: 'buy-bat' })
    expect(after).toMatchObject({ money: 100, batOwned: true, toolLevel: 3, cans: 17 })
    expect(getCapacity(after)).toBe(getCapacity(before))
    expect(getCansPerClick(after)).toBe(getCansPerClick(before))
    expect(getPassiveCansPerSecond(after)).toBe(0)
    expect(before.batOwned).toBe(false)
  })

  it('accepts exactly $40', () => {
    expect(applyCommand({ ...createInitialState(), money: 4000 }, { type: 'buy-bat' }))
      .toMatchObject({ batOwned: true, money: 0 })
  })

  it.each([
    { money: 3999, batOwned: false },
    { money: 8000, batOwned: true },
  ])('blocks an unaffordable or repeated bat purchase: %j', (fields) => {
    const state = { ...createInitialState(), ...fields }
    expect(canBuyBat(state)).toBe(false)
    expect(applyCommand(state, { type: 'buy-bat' })).toBe(state)
  })

  it('requires the bat before any recruitment hit', () => {
    const state = { ...createInitialState(), money: 1000 }
    expect(canHitVagabond(state)).toBe(false)
    expect(applyCommand(state, { type: 'hit-vagabond' })).toBe(state)
  })

  it('awards one producer and charges $1 exactly on the tenth hit', () => {
    let state = { ...createInitialState(), batOwned: true, money: 150 }
    for (let i = 1; i < 10; i++) {
      state = applyCommand(state, { type: 'hit-vagabond' })
      expect(state).toMatchObject({ recruitHits: i, vagabonds: 0, money: 150 })
    }
    state = applyCommand(state, { type: 'hit-vagabond' })
    expect(state).toMatchObject({ recruitHits: 0, vagabonds: 1, money: 50 })
    expect(getPassiveCansPerSecond(state)).toBe(1)
  })

  it('keeps nine hits when money is missing and finishes after a sale', () => {
    const state = { ...createInitialState(), batOwned: true, toolLevel: 3, money: 90, cans: 1, recruitHits: 9 }
    expect(canHitVagabond(state)).toBe(false)
    expect(applyCommand(state, { type: 'hit-vagabond' })).toBe(state)
    const sold = applyCommand(state, { type: 'sell' })
    expect(applyCommand(sold, { type: 'hit-vagabond' })).toMatchObject({ money: 0, vagabonds: 1, recruitHits: 0 })
  })

  it('allows starting with no money but holds the final hit until payment is possible', () => {
    let state = { ...createInitialState(), batOwned: true }
    for (let i = 0; i < 9; i++) state = applyCommand(state, { type: 'hit-vagabond' })
    expect(state).toMatchObject({ money: 0, recruitHits: 9, vagabonds: 0 })
    expect(applyCommand(state, { type: 'hit-vagabond' })).toBe(state)
  })

  it('stops at ten producers even with extra hits and money', () => {
    let state = { ...createInitialState(), batOwned: true, money: 2000 }
    for (let i = 0; i < 100; i++) state = applyCommand(state, { type: 'hit-vagabond' })
    expect(state).toMatchObject({ vagabonds: 10, money: 1000, recruitHits: 0 })
    expect(getPassiveCansPerSecond(state)).toBe(10)
    expect(canHitVagabond(state)).toBe(false)
    expect(applyCommand(state, { type: 'hit-vagabond' })).toBe(state)
  })
})
