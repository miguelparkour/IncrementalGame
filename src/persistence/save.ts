import { createInitialState, isGameState, type GameState } from '../game/state'
import { isAmount } from '../game/amount'
import { unlockAchievements } from '../game/achievements'

export const SAVE_VERSION = 3
export const SAVE_KEY = 'desde-cero.save'

export interface SaveData {
  readonly version: typeof SAVE_VERSION
  readonly savedAt: number
  readonly game: GameState
}

export type DecodeResult =
  | { kind: 'loaded'; save: SaveData }
  | { kind: 'invalid' }
  | { kind: 'unsupported-version' }

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function migrateLegacy(value: unknown, version: 1 | 2): GameState | null {
  if (typeof value !== 'object' || value === null ||
      !('money' in value) || !isAmount(value.money) ||
      !('cans' in value) || !isAmount(value.cans) ||
      !('toolLevel' in value) || !isAmount(value.toolLevel) || value.toolLevel > (version === 1 ? 2 : 3)) {
    return null
  }

  // v1's reinforced hook becomes the bag upgrade. Keep all money and inventory,
  // even above capacity; collecting stays blocked until those cans are sold.
  // Only infer achievements evidenced by the snapshot, never an unknown sale.
  const migrated = {
    ...createInitialState(),
    money: value.money,
    cans: value.cans,
    toolLevel: value.toolLevel,
    achievements: version === 1 ? [] : ('achievements' in value ? value.achievements : undefined),
  }
  if (!isGameState(migrated)) return null
  return version === 1 ? unlockAchievements(migrated) : migrated
}

/** Also usable by a future file export UI; no browser dependency. */
export function encodeSave(game: GameState, savedAt: number): string {
  if (!isGameState(game) || !isTimestamp(savedAt)) {
    throw new Error('Cannot serialize invalid game data')
  }

  return JSON.stringify({ version: SAVE_VERSION, savedAt, game } satisfies SaveData)
}

/** All external data enters through this boundary, including future imports. */
export function decodeSave(raw: string): DecodeResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { kind: 'invalid' }
  }

  if (typeof data !== 'object' || data === null || !('version' in data)) {
    return { kind: 'invalid' }
  }
  if (data.version !== 1 && data.version !== 2 && data.version !== SAVE_VERSION) return { kind: 'unsupported-version' }

  if (!('savedAt' in data) || !isTimestamp(data.savedAt) || !('game' in data)) {
    return { kind: 'invalid' }
  }

  const game = data.version === 1 || data.version === 2 ? migrateLegacy(data.game, data.version) : data.game
  if (!isGameState(game)) return { kind: 'invalid' }

  return {
    kind: 'loaded',
    save: {
      version: SAVE_VERSION,
      savedAt: data.savedAt,
      // Copy only known fields; do not merge arbitrary external data into state.
      game: {
        money: game.money, cans: game.cans, toolLevel: game.toolLevel, achievements: [...game.achievements],
        batOwned: game.batOwned, vagabonds: game.vagabonds, recruitHits: game.recruitHits,
        productionRemainder: game.productionRemainder,
      },
    },
  }
}
