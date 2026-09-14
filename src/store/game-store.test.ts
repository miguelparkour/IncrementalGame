import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../game/state'
import { decodeSave, encodeSave, SAVE_KEY } from '../persistence/save'
import { createMemoryStorage } from '../test/memory-storage'
import { createGameStore } from './game-store'

describe('game store integration, without React', () => {
  it('autosaves every successful action and restores progress in a new store', () => {
    const storage = createMemoryStorage()
    const store = createGameStore({ storage, now: () => 1000 })
    store.getState().dispatch({ type: 'buy-tool' })
    store.getState().dispatch({ type: 'collect' })
    store.getState().dispatch({ type: 'collect' })
    expect(createGameStore({ storage, now: () => 2000 }).getState().game.cans).toBe(2)
    store.getState().dispatch({ type: 'sell' })

    const restored = createGameStore({ storage, now: () => 2000 })
    expect(restored.getState().game).toEqual({ money: 20, cans: 0, toolLevel: 1 })
    expect(restored.getState().saveStatus).toBe('saved')
  })

  it('does not write again for invalid actions', () => {
    const storage = createMemoryStorage()
    const write = vi.spyOn(storage, 'setItem')
    const store = createGameStore({ storage, now: () => 1000 })
    write.mockClear()
    store.getState().dispatch({ type: 'collect' })
    store.getState().dispatch({ type: 'sell' })
    expect(write).not.toHaveBeenCalled()
  })

  it('has no offline earnings during the manual stage', () => {
    const storage = createMemoryStorage()
    const game = { money: 1000, cans: 7, toolLevel: 2 }
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
    ['{"version":2}', 'unsupported-version'],
  ])('preserves incompatible save %s until the player resets', (raw, status) => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, raw)
    const store = createGameStore({ storage, now: () => 1000 })
    expect(store.getState().saveStatus).toBe(status)
    store.getState().dispatch({ type: 'buy-tool' })
    expect(storage.getItem(SAVE_KEY)).toBe(raw)
    store.getState().reset()
    expect(store.getState().saveStatus).toBe('saved')
    expect(decodeSave(storage.getItem(SAVE_KEY) ?? '')).toMatchObject({ kind: 'loaded', save: { game: createInitialState() } })
  })

  it('keeps the game playable when saving fails and recovers on the next action', () => {
    const storage = createMemoryStorage()
    const store = createGameStore({ storage, now: () => 1000 })
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    store.getState().dispatch({ type: 'buy-tool' })
    expect(store.getState().game.toolLevel).toBe(1)
    expect(store.getState().saveStatus).toBe('unavailable')
    write.mockRestore()
    store.getState().dispatch({ type: 'collect' })
    expect(store.getState().saveStatus).toBe('saved')
    expect(createGameStore({ storage, now: () => 2000 }).getState().game.cans).toBe(1)
  })
})
