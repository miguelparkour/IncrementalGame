import { useRef, useState, type KeyboardEvent } from 'react'
import { ACHIEVEMENTS } from '../game/achievements'
import { GAME_CONFIG } from '../game/config'
import { canBuyTool, getCapacity, getCansPerClick, getCurrentTool, getNextTool } from '../game/economy'
import type { GameCommand } from '../game/engine'
import type { GameState } from '../game/state'
import { formatAmount, formatMoney } from './format'
import { canBuyBat } from '../game/vagabonds'
import { VagabondsPanel } from './VagabondsPanel'

const baseTabs = [
  { id: 'tools', label: 'Herramientas' },
  { id: 'achievements', label: 'Logros' },
] as const

export function ProgressPanel({ game, dispatch }: {
  game: GameState
  dispatch: (command: GameCommand) => void
}) {
  const [selected, setSelected] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabs = game.batOwned ? [...baseTabs, { id: 'vagabonds', label: 'Vagabundos' }] : baseTabs
  const active = selected < tabs.length ? selected : 0

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break
      case 'Home': next = 0; break
      case 'End': next = tabs.length - 1; break
      default: return
    }
    event.preventDefault()
    setSelected(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="panel equipment-panel" aria-label="Tu progreso">
      <div className="tabs" role="tablist" aria-label="Tu progreso">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className="tab-button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === index ? 0 : -1}
            ref={(element) => { tabRefs.current[index] = element }}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            {tab.label}
            {tab.id === 'achievements' && <span className="tab-count">{game.achievements.length}</span>}
          </button>
        ))}
      </div>

      <div id="panel-tools" className="tab-panel" role="tabpanel" aria-labelledby="tab-tools" tabIndex={0} hidden={active !== 0}>
        <Tools game={game} dispatch={dispatch} />
      </div>
      <div id="panel-achievements" className="tab-panel" role="tabpanel" aria-labelledby="tab-achievements" tabIndex={0} hidden={active !== 1}>
        <Achievements game={game} />
      </div>
      {game.batOwned && (
        <div id="panel-vagabonds" className="tab-panel" role="tabpanel" aria-labelledby="tab-vagabonds" tabIndex={0} hidden={active !== 2}>
          <VagabondsPanel game={game} dispatch={dispatch} />
        </div>
      )}
    </section>
  )
}

function Tools({ game, dispatch }: { game: GameState; dispatch: (command: GameCommand) => void }) {
  const current = getCurrentTool(game)
  const next = getNextTool(game)
  const capacity = getCapacity(game)
  const perClick = getCansPerClick(game)

  return (
    <>
      <h2>Tu equipo</h2>
      <p className="panel-description">Más espacio para avanzar en cada viaje.</p>
      <div className="current-tool">
        <span className="eyebrow">EQUIPO ACTUAL</span>
        <strong>{current?.name ?? GAME_CONFIG.hands.name}</strong>
        <span>Capacidad: {formatAmount(capacity)} latas · {formatAmount(perClick)} por clic</span>
      </div>
      {next ? (
        <div className="upgrade">
          <p className="eyebrow">{current ? 'SIGUIENTE COMPRA' : 'TU PRIMERA HERRAMIENTA'}</p>
          <h3>{next.name}</h3>
          <p>{next.description}</p>
          <div className="upgrade-effect">
            <span>Capacidad total</span>
            <strong>{formatAmount(capacity)} → {formatAmount(next.capacity)} latas</strong>
          </div>
          <div className="upgrade-effect">
            <span>Latas por clic</span>
            <strong>{formatAmount(perClick)} → {formatAmount(next.cansPerClick)}</strong>
          </div>
          <button className="button button-primary" disabled={!canBuyTool(game)} onClick={() => dispatch({ type: 'buy-tool' })}>
            <span>{next.purchaseLabel}</span>
            <span className="button-meta">{formatMoney(next.cost)}</span>
          </button>
          <p className="purchase-hint">{canBuyTool(game)
            ? 'Tienes suficiente para dar este paso.'
            : `Necesitas ${formatMoney(next.cost)}. Recoge y vende para seguir mejorando.`}</p>
        </div>
      ) : (
        <div className="upgrade complete">
          <span className="eyebrow">TRANSPORTE COMPLETO</span>
          <h3>Todo listo para el próximo viaje.</h3>
          <p>Ya tienes todas las mejoras de transporte de esta versión.</p>
        </div>
      )}
      <div className="upgrade bat-upgrade">
        <p className="eyebrow">RECLUTAMIENTO</p>
        <h3>{GAME_CONFIG.bat.name}</h3>
        <p>Desbloquea los vagabundos y la producción automática de latas. Conservas tu equipo de transporte.</p>
        {game.batOwned ? (
          <p className="owned-equipment">Comprado · Pestaña Vagabundos desbloqueada</p>
        ) : (
          <>
            <button className="button button-primary" disabled={!canBuyBat(game)} onClick={() => dispatch({ type: 'buy-bat' })}>
              <span>Comprar bate de béisbol</span>
              <span className="button-meta">{formatMoney(GAME_CONFIG.bat.cost)}</span>
            </button>
            <p className="purchase-hint">{formatMoney(GAME_CONFIG.bat.cost)} por el bate; {formatMoney(GAME_CONFIG.vagabonds.recruitmentCost)} al conseguir cada vagabundo.</p>
          </>
        )}
      </div>
    </>
  )
}

function Achievements({ game }: { game: GameState }) {
  const completed = game.achievements.flatMap((id) => {
    const achievement = ACHIEVEMENTS.find((entry) => entry.id === id)
    return achievement ? [achievement] : []
  })

  return (
    <>
      <h2>Tus logros</h2>
      <p className="panel-description">{completed.length} de {ACHIEVEMENTS.length} completados. Cada paso tiene su historia.</p>
      {completed.length === 0 ? (
        <p className="achievements-empty">Todavía no has completado ningún logro. Recoge tu primera lata para empezar.</p>
      ) : (
        <ul className="achievement-list">
          {completed.map((achievement) => (
            <li key={achievement.id} className="achievement">
              <span className="achievement-check" aria-hidden="true">✓</span>
              <div><h3>{achievement.name}</h3><p>{achievement.description}</p></div>
            </li>
          ))}
        </ul>
      )}
      <p className="work-note">Los logros se conservan al vender o comprar. No otorgan bonificaciones.</p>
    </>
  )
}
