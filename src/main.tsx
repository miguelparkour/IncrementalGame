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

// The timer only requests updates. Production uses the elapsed wall-clock time
// in the store, including missed updates and time with the page closed/hidden.
let timer: ReturnType<typeof setTimeout> | undefined
function schedule() {
  timer = setTimeout(() => {
    advance()
    if (document.visibilityState === 'visible') schedule()
  }, 250)
}
function syncVisibility() {
  clearTimeout(timer)
  advance()
  if (document.visibilityState === 'visible') schedule()
}
document.addEventListener('visibilitychange', syncVisibility)
window.addEventListener('pageshow', syncVisibility)
syncVisibility()

const container = document.getElementById('root')
if (!container) throw new Error('Missing root element')
const root = createRoot(container)
root.render(<StrictMode><App store={store} /></StrictMode>)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('pagehide', advance)
    document.removeEventListener('visibilitychange', syncVisibility)
    window.removeEventListener('pageshow', syncVisibility)
    clearTimeout(timer)
    root.unmount()
  })
}
