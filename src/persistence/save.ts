import { isGameState, type GameState } from '../game/state'

export const SAVE_VERSION = 1
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
  // When v2 exists, migrate known older versions here before validation.
  if (data.version !== SAVE_VERSION) return { kind: 'unsupported-version' }

  if (!('savedAt' in data) || !isTimestamp(data.savedAt) ||
      !('game' in data) || !isGameState(data.game)) {
    return { kind: 'invalid' }
  }

  return {
    kind: 'loaded',
    save: {
      version: SAVE_VERSION,
      savedAt: data.savedAt,
      // Copy only known fields; do not merge arbitrary external data into state.
      game: { money: data.game.money, cans: data.game.cans, toolLevel: data.game.toolLevel },
    },
  }
}
