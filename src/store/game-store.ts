import { createStore } from 'zustand/vanilla'
import { advanceGame, applyCommand, type GameCommand } from '../game/engine'
import { createInitialState, type GameState } from '../game/state'
import { createSaveRepository, type SaveStorage } from '../persistence/storage'

export type SaveStatus = 'saved' | 'unavailable' | 'invalid' | 'unsupported-version'

interface GameStoreState {
  game: GameState
  saveStatus: SaveStatus
  dispatch: (command: GameCommand) => void
  advance: () => void
  reset: () => void
}

interface GameStoreOptions {
  storage: SaveStorage | undefined
  now?: () => number
}

export function createGameStore({ storage, now = Date.now }: GameStoreOptions) {
  const repository = createSaveRepository(storage)
  const loaded = repository.load()
  const currentTime = now()
  // A clock moving backwards must not award the same elapsed period twice.
  let lastUpdatedAt = loaded.kind === 'loaded'
    ? Math.max(currentTime, loaded.save.savedAt)
    : currentTime
  let protectExistingSave = loaded.kind === 'invalid' || loaded.kind === 'unsupported-version'

  const initialGame = loaded.kind === 'loaded'
    ? advanceGame(loaded.save.game, Math.max(0, currentTime - loaded.save.savedAt))
    : createInitialState()

  const initialStatus: SaveStatus = loaded.kind === 'loaded' || loaded.kind === 'empty'
    ? (repository.save(initialGame, lastUpdatedAt) ? 'saved' : 'unavailable')
    : loaded.kind

  return createStore<GameStoreState>()((set, get) => {
    function update(command?: GameCommand) {
      const previous = get()
      const timestamp = Math.max(lastUpdatedAt, now())
      let game = advanceGame(previous.game, timestamp - lastUpdatedAt)
      lastUpdatedAt = timestamp
      if (command) game = applyCommand(game, command)
      if (game === previous.game) return

      // Each meaningful action saves immediately; the v1 snapshot is tiny.
      const saveStatus = protectExistingSave
        ? previous.saveStatus
        : (repository.save(game, timestamp) ? 'saved' : 'unavailable')
      set({ game, saveStatus })
    }

    return {
      game: initialGame,
      saveStatus: initialStatus,
      dispatch: (command) => update(command),
      advance: () => update(),
      reset: () => {
        protectExistingSave = false
        lastUpdatedAt = now()
        const cleared = repository.clear()
        const game = createInitialState()
        const saved = repository.save(game, lastUpdatedAt)
        set({ game, saveStatus: cleared && saved ? 'saved' : 'unavailable' })
      },
    }
  })
}

export type GameStore = ReturnType<typeof createGameStore>
