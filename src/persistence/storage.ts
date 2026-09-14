import type { GameState } from '../game/state'
import { decodeSave, encodeSave, SAVE_KEY, type DecodeResult } from './save'

export interface SaveStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type LoadResult = DecodeResult | { kind: 'empty' } | { kind: 'unavailable' }

/** Storage is injected so tests, a future IndexedDB adapter or Phaser need no DOM. */
export function createSaveRepository(storage: SaveStorage | undefined) {
  return {
    load(): LoadResult {
      try {
        if (!storage) return { kind: 'unavailable' }
        const raw = storage.getItem(SAVE_KEY)
        return raw === null ? { kind: 'empty' } : decodeSave(raw)
      } catch {
        return { kind: 'unavailable' }
      }
    },
    save(game: GameState, now: number): boolean {
      try {
        if (!storage) return false
        storage.setItem(SAVE_KEY, encodeSave(game, now))
        return true
      } catch {
        return false
      }
    },
    clear(): boolean {
      try {
        if (!storage) return false
        storage.removeItem(SAVE_KEY)
        return true
      } catch {
        return false
      }
    },
  }
}
