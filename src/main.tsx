import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { SaveStorage } from './persistence/storage'
import { createGameStore } from './store/game-store'
import { App } from './ui/App'
import './ui/styles.css'

function getBrowserStorage(): SaveStorage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

// Created outside React: renders and StrictMode never initialize the game twice.
const store = createGameStore({ storage: getBrowserStorage() })
const advance = () => store.getState().advance()
window.addEventListener('pagehide', advance)
document.addEventListener('visibilitychange', advance)

// No permanent loop is needed for a manual-only game. A future scheduler can
// call advance(); its frequency will not determine the amount produced.
const container = document.getElementById('root')
if (!container) throw new Error('Missing root element')
const root = createRoot(container)
root.render(<StrictMode><App store={store} /></StrictMode>)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('pagehide', advance)
    document.removeEventListener('visibilitychange', advance)
    root.unmount()
  })
}
