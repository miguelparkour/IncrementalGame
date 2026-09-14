import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../game/state'
import { getCapacity, getCansPerClick } from '../game/economy'
import { decodeSave, encodeSave, SAVE_KEY } from '../persistence/save'
import { createMemoryStorage } from '../test/memory-storage'
import { createGameStore } from './game-store'

describe('game store integration, without React', () => {
  it('loads an existing bag save, buys the cart and restores it after reload', () => {
    const storage = createMemoryStorage()
    const bag = { ...createInitialState(), money: 2000, toolLevel: 2, cans: 20 }
    storage.setItem(SAVE_KEY, encodeSave(bag, 1000))
    const store = createGameStore({ storage, now: () => 2000 })
    store.getState().dispatch({ type: 'buy-tool' })

    const restored = createGameStore({ storage, now: () => 3000 })
    expect(restored.getState().game).toMatchObject({ money: 0, cans: 20, toolLevel: 3 })
    expect(restored.getState().saveStatus).toBe('saved')
    expect(getCapacity(restored.getState().game)).toBe(100)
    expect(getCansPerClick(restored.getState().game)).toBe(2)
  })

  it('autosaves every successful action and restores progress in a new store', () => {
    const storage = createMemoryStorage()
    const store = createGameStore({ storage, now: () => 1000 })
    store.getState().dispatch({ type: 'collect' })
    store.getState().dispatch({ type: 'collect' })
    expect(createGameStore({ storage, now: () => 2000 }).getState().game.cans).toBe(2)
    store.getState().dispatch({ type: 'sell' })

    const restored = createGameStore({ storage, now: () => 2000 })
    expect(restored.getState().game).toEqual({ ...createInitialState(), money: 20, achievements: ['first-can', 'full-hands', 'first-sale'] })
    expect(restored.getState().saveStatus).toBe('saved')
  })

  it('does not write again for invalid actions', () => {
    const storage = createMemoryStorage()
    const write = vi.spyOn(storage, 'setItem')
    const store = createGameStore({ storage, now: () => 1000 })
    write.mockClear()
    store.getState().dispatch({ type: 'buy-tool' })
    store.getState().dispatch({ type: 'sell' })
    expect(write).not.toHaveBeenCalled()
  })

  it('has no offline earnings during the manual stage', () => {
    const storage = createMemoryStorage()
    const game = { ...createInitialState(), money: 1000, cans: 7, toolLevel: 2 }
    storage.setItem(SAVE_KEY, encodeSave(game, 1000))
    const store = createGameStore({ storage, now: () => 86_401_000 })
    store.getState().advance()
    expect(store.getState().game).toEqual(game)
  })

  it('never moves the saved timestamp backwards when the system clock changes', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, encodeSave({ ...createInitialState(), toolLevel: 1 }, 10_000))
    const store = createGameStore({ storage, now: () => 5000 })
    store.getState().dispatch({ type: 'collect' })
    expect(decodeSave(storage.getItem(SAVE_KEY) ?? '')).toMatchObject({ save: { savedAt: 10_000 } })
  })

  it('resets progress persistently without deleting unrelated data', () => {
    const storage = createMemoryStorage()
    storage.setItem('other-app', 'untouched')
    const store = createGameStore({ storage, now: () => 1000 })
    store.getState().dispatch({ type: 'buy-tool' })
    store.getState().dispatch({ type: 'collect' })
    store.getState().reset()
    expect(store.getState().game).toEqual(createInitialState())
    expect(createGameStore({ storage, now: () => 2000 }).getState().game).toEqual(createInitialState())
    expect(storage.getItem('other-app')).toBe('untouched')
  })

  it.each([
    ['broken-json', 'invalid'],
    ['{"version":4}', 'unsupported-version'],
  ])('preserves incompatible save %s until the player resets', (raw, status) => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, raw)
    const store = createGameStore({ storage, now: () => 1000 })
    expect(store.getState().saveStatus).toBe(status)
    store.getState().dispatch({ type: 'collect' })
    expect(storage.getItem(SAVE_KEY)).toBe(raw)
    store.getState().reset()
    expect(store.getState().saveStatus).toBe('saved')
    expect(decodeSave(storage.getItem(SAVE_KEY) ?? '')).toMatchObject({ kind: 'loaded', save: { game: createInitialState() } })
  })

  it('keeps the game playable when saving fails and recovers on the next action', () => {
    const storage = createMemoryStorage()
    const store = createGameStore({ storage, now: () => 1000 })
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    store.getState().dispatch({ type: 'collect' })
    expect(store.getState().game.cans).toBe(1)
    expect(store.getState().saveStatus).toBe('unavailable')
    write.mockRestore()
    store.getState().dispatch({ type: 'collect' })
    expect(store.getState().saveStatus).toBe('saved')
    expect(createGameStore({ storage, now: () => 2000 }).getState().game.cans).toBe(2)
  })

  it('persists v1 migration as v3 and preserves the new capacity after reload', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 0, game: { money: 600, cans: 7, toolLevel: 1 } }))
    const store = createGameStore({ storage, now: () => 1000 })
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '').version).toBe(3)
    store.getState().dispatch({ type: 'buy-tool' })
    const restored = createGameStore({ storage, now: () => 2000 })
    expect(restored.getState().game).toMatchObject({ money: 100, cans: 7, toolLevel: 2 })
    expect(restored.getState().game.achievements).toContain('bag-tool')
    restored.getState().dispatch({ type: 'collect' })
    expect(restored.getState().game.cans).toBe(9)
  })

  it('preserves recruitment progress across reloads and charges only on completion', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, encodeSave({ ...createInitialState(), money: 4100 }, 0))
    const store = createGameStore({ storage, now: () => 0 })
    store.getState().dispatch({ type: 'buy-bat' })
    for (let i = 0; i < 9; i++) store.getState().dispatch({ type: 'hit-vagabond' })
    const restored = createGameStore({ storage, now: () => 1000 })
    expect(restored.getState().game).toMatchObject({ batOwned: true, money: 100, recruitHits: 9, vagabonds: 0, cans: 0 })
    restored.getState().dispatch({ type: 'hit-vagabond' })
    expect(restored.getState().game).toMatchObject({ money: 0, recruitHits: 0, vagabonds: 1 })
  })

  it('settles elapsed production at the old rate before recruiting another producer', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, encodeSave({ ...createInitialState(), money: 100, toolLevel: 3, batOwned: true, vagabonds: 1, recruitHits: 9 }, 0))
    let time = 0
    const store = createGameStore({ storage, now: () => time })
    time = 1000
    store.getState().dispatch({ type: 'hit-vagabond' })
    expect(store.getState().game).toMatchObject({ cans: 1, vagabonds: 2 })
    time = 1500
    store.getState().advance()
    expect(store.getState().game.cans).toBe(2)
  })

  it('restores fractional production offline without awarding it twice', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, encodeSave({ ...createInitialState(), toolLevel: 3, batOwned: true, vagabonds: 1, productionRemainder: 500 }, 1000))
    const restored = createGameStore({ storage, now: () => 1500 })
    expect(restored.getState().game).toMatchObject({ cans: 1, productionRemainder: 0 })
    expect(createGameStore({ storage, now: () => 1500 }).getState().game.cans).toBe(1)
  })

  it('caps offline earnings, then resumes at the current time after selling', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, encodeSave({ ...createInitialState(), toolLevel: 3, batOwned: true, vagabonds: 10 }, 0))
    let time = 86_400_000
    const store = createGameStore({ storage, now: () => time })
    expect(store.getState().game).toMatchObject({ cans: 100, money: 0, productionRemainder: 0 })
    store.getState().dispatch({ type: 'sell' })
    time += 1000
    store.getState().advance()
    expect(store.getState().game).toMatchObject({ cans: 10, money: 1000 })
  })

  it('resets the bat, producers, hits and fractional progress persistently', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, encodeSave({ ...createInitialState(), batOwned: true, vagabonds: 2, recruitHits: 4, productionRemainder: 100 }, 0))
    const store = createGameStore({ storage, now: () => 0 })
    store.getState().reset()
    expect(createGameStore({ storage, now: () => 100_000 }).getState().game).toEqual(createInitialState())
  })
})
