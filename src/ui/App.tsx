import { useState } from 'react'
import { useStore } from 'zustand'
import { GAME_CONFIG } from '../game/config'
import {
  canBuyTool,
  canCollect,
  canSell,
  getCansPerClick,
  getCurrentTool,
  getNextTool,
  getSaleValue,
} from '../game/economy'
import type { GameStore, SaveStatus } from '../store/game-store'
import { formatAmount, formatMoney } from './format'

const saveMessages: Record<SaveStatus, string> = {
  saved: 'Progreso guardado en este navegador.',
  unavailable: 'No se ha podido guardar. Puedes jugar, pero el progreso podría perderse al cerrar. Comprueba que el navegador permite almacenamiento local.',
  invalid: 'La partida guardada está dañada. Se conserva sin sobrescribirla; este nuevo progreso no se guardará hasta que reinicies la partida.',
  'unsupported-version': 'La partida usa una versión incompatible. Se conserva sin sobrescribirla; este nuevo progreso no se guardará hasta que reinicies la partida.',
}

export function App({ store }: { store: GameStore }) {
  const game = useStore(store, (state) => state.game)
  const saveStatus = useStore(store, (state) => state.saveStatus)
  const dispatch = useStore(store, (state) => state.dispatch)
  const reset = useStore(store, (state) => state.reset)
  const [confirmReset, setConfirmReset] = useState(false)

  const currentTool = getCurrentTool(game)
  const nextTool = getNextTool(game)
  const cansPerClick = getCansPerClick(game)
  const saleValue = getSaleValue(game.cans)
  const canAffordTool = canBuyTool(game)

  function restart() {
    reset()
    setConfirmReset(false)
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <a className="wordmark" href="./" aria-label="Desde cero, inicio">
          <span className="brand-mark" aria-hidden="true">↗</span>
          DESDE CERO
        </a>
        <span className="stage">Etapa 01 <span aria-hidden="true">/</span> Por tu cuenta</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">UN PEQUEÑO COMIENZO</p>
        <h1 id="page-title">Todo empieza con una lata.</h1>
        <p>Un dólar, tus manos y algo de ingenio. Recoge, vende y reinvierte en tu primer negocio.</p>
      </section>

      <section className="resources" aria-label="Tus recursos" aria-live="polite" aria-atomic="true">
        <dl className="resource-grid">
          <div className="resource resource-money">
            <dt>Dinero disponible</dt>
            <dd>{formatMoney(game.money)}</dd>
          </div>
          <div className="resource">
            <dt>Latas almacenadas</dt>
            <dd>{formatAmount(game.cans)}</dd>
          </div>
          <div className="resource resource-detail">
            <dt>Latas por clic</dt>
            <dd>{formatAmount(cansPerClick)} <span>latas</span></dd>
          </div>
          <div className="resource resource-detail">
            <dt>Precio de venta</dt>
            <dd>{formatMoney(GAME_CONFIG.canSalePrice)} <span>/ lata</span></dd>
          </div>
        </dl>
      </section>

      <div className="workspace">
        <section className="panel work-panel" aria-labelledby="work-title">
          <div className="panel-heading">
            <h2 id="work-title">A pie de calle</h2>
            <span className="badge">Trabajo manual</span>
          </div>
          <p className="panel-description">Cada pequeño viaje cuenta.</p>

          <div className="work-step">
            <span className="step-number" aria-hidden="true">01</span>
            <div>
              <h3>Recoge latas</h3>
              <p id="collect-help">{currentTool
                ? `Tu ${currentTool.name.toLocaleLowerCase('es')} recoge ${formatAmount(cansPerClick)} ${cansPerClick === 1 ? 'lata' : 'latas'} por clic.`
                : 'Compra tu primer palo con gancho para empezar.'}</p>
            </div>
          </div>
          <button
            className="button button-primary collect-button"
            disabled={!canCollect(game)}
            aria-describedby="collect-help"
            onClick={() => dispatch({ type: 'collect' })}
          >
            <span>Recoger latas</span>
            <span className="button-meta">+{formatAmount(cansPerClick)} / clic</span>
          </button>

          <div className="work-step sell-step">
            <span className="step-number" aria-hidden="true">02</span>
            <div>
              <h3>Vende lo que has recogido</h3>
              <p id="sell-help">Lleva todas tus latas al punto de reciclaje.</p>
            </div>
          </div>
          <button
            className="button button-secondary"
            disabled={!canSell(game)}
            aria-describedby="sell-help"
            onClick={() => dispatch({ type: 'sell' })}
          >
            <span>Vender todas las latas</span>
            <span className="button-meta">{saleValue === null ? 'Límite numérico' : `+${formatMoney(saleValue)}`}</span>
          </button>
          <p className="work-note">Por ahora trabajas solo: las latas se recogen con tus clics.</p>
        </section>

        <section className="panel equipment-panel" aria-labelledby="equipment-title">
          <div className="panel-heading">
            <h2 id="equipment-title">Tu equipo</h2>
          </div>
          <p className="panel-description">Invierte en hacer mejor tu trabajo.</p>

          <div className="current-tool">
            <span className="eyebrow">HERRAMIENTA ACTUAL</span>
            <strong>{currentTool?.name ?? 'Todavía sin herramienta'}</strong>
            <span>{currentTool ? `${formatAmount(cansPerClick)} ${cansPerClick === 1 ? 'lata' : 'latas'} por clic` : 'Todo listo para dar el primer paso.'}</span>
          </div>

          {nextTool ? (
            <div className="upgrade">
              <p className="eyebrow">{currentTool ? 'SIGUIENTE MEJORA' : 'TU PRIMERA COMPRA'}</p>
              <h3>{nextTool.name}</h3>
              <p>{nextTool.description}</p>
              <div className="upgrade-effect">
                <span>Latas por clic</span>
                <strong>{formatAmount(cansPerClick)} → {formatAmount(nextTool.cansPerClick)}</strong>
              </div>
              <button
                className="button button-primary"
                disabled={!canAffordTool}
                onClick={() => dispatch({ type: 'buy-tool' })}
              >
                <span>{currentTool ? 'Mejorar gancho' : 'Comprar palo con gancho'}</span>
                <span className="button-meta">{formatMoney(nextTool.cost)}</span>
              </button>
              <p className="purchase-hint">{canAffordTool
                ? 'Tienes suficiente para dar este paso.'
                : `Necesitas ${formatMoney(nextTool.cost)}. Recoge y vende para seguir mejorando.`}</p>
            </div>
          ) : (
            <div className="upgrade complete" role="status">
              <span className="eyebrow">PRIMER OBJETIVO CONSEGUIDO</span>
              <h3>Una herramienta mejor. Un buen comienzo.</h3>
              <p>Ya tienes todas las mejoras de este prototipo. Puedes seguir recogiendo y vendiendo latas.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="page-footer">
        <p className={`save-status ${saveStatus === 'saved' ? '' : 'save-warning'}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {saveMessages[saveStatus]}
        </p>
        {confirmReset ? (
          <div className="reset-confirmation" role="group" aria-label="Confirmar reinicio">
            <p>Se borrará tu progreso y volverás a empezar con {formatMoney(GAME_CONFIG.startingMoney)}.</p>
            <div className="reset-actions">
              <button className="text-button" onClick={() => setConfirmReset(false)}>Cancelar</button>
              <button className="text-button danger" onClick={restart}>Borrar y empezar de nuevo</button>
            </div>
          </div>
        ) : (
          <button className="text-button" onClick={() => setConfirmReset(true)}>Reiniciar partida</button>
        )}
      </footer>
      <p className="prototype-note">Prototipo 0.1 · Paso a paso, desde cero.</p>
    </main>
  )
}
