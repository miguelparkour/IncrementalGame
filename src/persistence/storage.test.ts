import { describe, expect, it } from 'vitest'
import { createInitialState } from '../game/state'
import { createMemoryStorage } from '../test/memory-storage'
import { SAVE_KEY } from './save'
import { createSaveRepository, type SaveStorage } from './storage'

describe('storage adapter', () => {
  it('handles a missing save and loads a persisted snapshot', () => {
    const repository = createSaveRepository(createMemoryStorage())
    expect(repository.load()).toEqual({ kind: 'empty' })
    expect(repository.save(createInitialState(), 1000)).toBe(true)
    expect(repository.load()).toMatchObject({ kind: 'loaded', save: { savedAt: 1000, game: createInitialState() } })
  })

  it('clears only the game key', () => {
    const storage = createMemoryStorage()
    storage.setItem('unrelated', 'keep')
    const repository = createSaveRepository(storage)
    repository.save(createInitialState(), 1000)
    expect(repository.clear()).toBe(true)
    expect(storage.getItem(SAVE_KEY)).toBeNull()
    expect(storage.getItem('unrelated')).toBe('keep')
  })

  it('handles unavailable browser storage', () => {
    const repository = createSaveRepository(undefined)
    expect(repository.load()).toEqual({ kind: 'unavailable' })
    expect(repository.save(createInitialState(), 1000)).toBe(false)
    expect(repository.clear()).toBe(false)
  })

  it('handles security and quota errors without throwing', () => {
    const fail = () => { throw new Error('Storage blocked') }
    const storage: SaveStorage = { getItem: fail, setItem: fail, removeItem: fail }
    const repository = createSaveRepository(storage)
    expect(repository.load()).toEqual({ kind: 'unavailable' })
    expect(repository.save(createInitialState(), 1000)).toBe(false)
    expect(repository.clear()).toBe(false)
  })
})
