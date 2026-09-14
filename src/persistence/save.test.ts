import { describe, expect, it } from 'vitest'
import { createInitialState } from '../game/state'
import { decodeSave, encodeSave, SAVE_VERSION } from './save'

describe('versioned save format', () => {
  it('round trips game state and timestamp', () => {
    const game = { money: 230, cans: 17, toolLevel: 1 }
    expect(decodeSave(encodeSave(game, 10_000))).toEqual({
      kind: 'loaded', save: { version: SAVE_VERSION, savedAt: 10_000, game },
    })
  })

  it.each(['{broken', 'null', '[]', '{}', '42'])('rejects malformed data: %s', (raw) => {
    expect(decodeSave(raw)).toEqual({ kind: 'invalid' })
  })

  it('keeps unsupported versions separate from malformed saves', () => {
    expect(decodeSave(JSON.stringify({ version: 2 }))).toEqual({ kind: 'unsupported-version' })
  })

  it.each([
    { money: -1 }, { money: '100' }, { money: 0.1 },
    { money: Number.MAX_SAFE_INTEGER + 1 }, { money: null },
    { cans: -1 }, { cans: 1.5 }, { cans: '3' },
    { toolLevel: -1 }, { toolLevel: 0.5 }, { toolLevel: 99 },
  ])('rejects invalid game fields: %j', (fields) => {
    const raw = JSON.stringify({ version: SAVE_VERSION, savedAt: 0, game: { ...createInitialState(), ...fields } })
    expect(decodeSave(raw)).toEqual({ kind: 'invalid' })
  })

  it.each([-1, 0.5, null, '1000'])('rejects invalid timestamp %s', (savedAt) => {
    const raw = JSON.stringify({ version: SAVE_VERSION, savedAt, game: createInitialState() })
    expect(decodeSave(raw)).toEqual({ kind: 'invalid' })
  })

  it('rejects incomplete states', () => {
    expect(decodeSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, game: { money: 100 } })))
      .toEqual({ kind: 'invalid' })
  })

  it('discards unknown fields rather than merging them into the game', () => {
    const game = { ...createInitialState(), unknown: 'discard me' }
    const loaded = decodeSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, game }))
    expect(loaded).toEqual({ kind: 'loaded', save: { version: SAVE_VERSION, savedAt: 0, game: createInitialState() } })
  })

  it('does not serialize invalid numbers', () => {
    expect(() => encodeSave({ ...createInitialState(), money: Infinity }, 0)).toThrow()
    expect(() => encodeSave(createInitialState(), NaN)).toThrow()
  })
})
