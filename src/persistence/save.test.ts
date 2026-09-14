import { describe, expect, it } from 'vitest'
import { createInitialState, type GameState } from '../game/state'
import { applyCommand } from '../game/engine'
import { getCapacity } from '../game/economy'
import { decodeSave, encodeSave, SAVE_VERSION } from './save'

describe('versioned save format', () => {
  it('round trips game state and timestamp', () => {
    const game: GameState = {
      ...createInitialState(), money: 230, cans: 17, toolLevel: 2, achievements: ['first-can', 'first-sale'],
      batOwned: true, vagabonds: 3, recruitHits: 7, productionRemainder: 375,
    }
    expect(decodeSave(encodeSave(game, 10_000))).toEqual({
      kind: 'loaded', save: { version: SAVE_VERSION, savedAt: 10_000, game },
    })
  })

  it.each(['{broken', 'null', '[]', '{}', '42'])('rejects malformed data: %s', (raw) => {
    expect(decodeSave(raw)).toEqual({ kind: 'invalid' })
  })

  it('keeps unsupported versions separate from malformed saves', () => {
    expect(decodeSave(JSON.stringify({ version: 4 }))).toEqual({ kind: 'unsupported-version' })
  })

  it.each([
    { money: -1 }, { money: '100' }, { money: 0.1 },
    { money: Number.MAX_SAFE_INTEGER + 1 }, { money: null },
    { cans: -1 }, { cans: 1.5 }, { cans: '3' },
    { toolLevel: -1 }, { toolLevel: 0.5 }, { toolLevel: 99 },
    { achievements: null }, { achievements: 'first-can' },
    { achievements: ['unknown'] }, { achievements: ['first-can', 'first-can'] },
    { batOwned: 'true' }, { vagabonds: -1 }, { batOwned: true, vagabonds: 11 },
    { batOwned: true, vagabonds: 1.5 }, { vagabonds: 1 }, { recruitHits: 1 },
    { batOwned: true, recruitHits: 10 }, { batOwned: true, recruitHits: -1 },
    { batOwned: true, recruitHits: 0.5 }, { batOwned: true, vagabonds: 10, recruitHits: 1 },
    { productionRemainder: 1 }, { batOwned: true, vagabonds: 1, productionRemainder: 1000 },
    { batOwned: true, vagabonds: 1, productionRemainder: -1 },
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

  it('requires achievements in v2 instead of treating an incomplete save as v1', () => {
    expect(decodeSave(JSON.stringify({ version: 2, savedAt: 0, game: { money: 0, cans: 0, toolLevel: 0 } })))
      .toEqual({ kind: 'invalid' })
  })

  it.each([[0, 2], [1, 5], [2, 20]])('migrates a v1 level %i to capacity %i without losing money or cans', (toolLevel, capacity) => {
    const loaded = decodeSave(JSON.stringify({ version: 1, savedAt: 1000, game: { money: 1230, cans: 40, toolLevel } }))
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Expected migrated save')
    expect(loaded.save.version).toBe(3)
    expect(loaded.save.savedAt).toBe(1000)
    const game = loaded.save.game
    expect(game).toMatchObject({ money: 1230, cans: 40, toolLevel })
    expect(getCapacity(game)).toBe(capacity)
    expect(applyCommand(game, { type: 'collect' })).toBe(game)
    expect(game.achievements).not.toContain('first-sale')
    const sold = applyCommand(game, { type: 'sell' })
    expect(sold).toMatchObject({ money: 1630, cans: 0 })
    expect(applyCommand(sold, { type: 'collect' }).cans).toBe(toolLevel === 2 ? 2 : 1)
    expect(decodeSave(encodeSave(game, 1000))).toEqual(loaded)
  })

  it('maps the old reinforced hook to the bag and recognizes owned-tool achievements', () => {
    const loaded = decodeSave(JSON.stringify({ version: 1, savedAt: 0, game: { money: 0, cans: 0, toolLevel: 2 } }))
    expect(loaded).toMatchObject({ kind: 'loaded', save: { game: { toolLevel: 2, achievements: ['first-tool', 'bag-tool'] } } })
  })

  it('migrates v2 without granting a bat, recruitment or passive production', () => {
    const legacy = { money: 4500, cans: 99, toolLevel: 3, achievements: ['first-can', 'bag-tool'] }
    const loaded = decodeSave(JSON.stringify({ version: 2, savedAt: 1234, game: legacy }))
    expect(loaded).toEqual({
      kind: 'loaded', save: { version: 3, savedAt: 1234, game: { ...createInitialState(), ...legacy } },
    })
  })

  it('requires new fields in v3 instead of silently resetting them', () => {
    const game = { money: 0, cans: 0, toolLevel: 0, achievements: [] }
    expect(decodeSave(JSON.stringify({ version: 3, savedAt: 0, game }))).toEqual({ kind: 'invalid' })
  })

  it.each([
    { money: -1, cans: 0, toolLevel: 0 },
    { money: 100, cans: 0, toolLevel: 3 },
    { money: 100, cans: '3', toolLevel: 1 },
    { money: 100 },
  ])('rejects malformed legacy data instead of migrating it: %j', (game) => {
    expect(decodeSave(JSON.stringify({ version: 1, savedAt: 0, game }))).toEqual({ kind: 'invalid' })
  })
})
