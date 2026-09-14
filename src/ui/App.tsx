import { useState } from 'react'
import { useStore } from 'zustand'
import { GAME_CONFIG } from '../game/config'
import {
  canCollect,
  canSell,
  getCapacity,
  getCansPerClick,
  getCollectionAmount,
  getCurrentTool,
  getSaleValue,
} from '../game/economy'
import type { GameStore, SaveStatus } from '../store/game-store'
import { formatAmount, formatMoney } from './format'
import { ProgressPanel } from './ProgressPanel'
import { getPassiveCansPerSecond } from '../game/vagabonds'

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
  const cansPerClick = getCansPerClick(game)
  const capacity = getCapacity(game)
  const collectionAmount = getCollectionAmount(game)
  const saleValue = getSaleValue(game.cans)
  const passiveRate = getPassiveCansPerSecond(game)

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
        <span className="stage">Etapa 01 <span aria-hidden="true">/</span> {game.vagabonds > 0 ? 'Con ayuda' : 'Por tu cuenta'}</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">UN PEQUEÑO COMIENZO</p>
        <h1 id="page-title">Todo empieza con una lata.</h1>
        <p>Sin dinero, con tus manos y algo de ingenio. Recoge, vende y reinvierte en tu primer negocio.</p>
      </section>

      <section className="resources" aria-label="Tus recursos" aria-live="polite" aria-atomic="true">
        <dl className="resource-grid">
          <div className="resource resource-money">
            <dt>Dinero disponible</dt>
            <dd>{formatMoney(game.money)}</dd>
          </div>
          <div className="resource">
            <dt>Latas / capacidad</dt>
            <dd>{formatAmount(game.cans)} <span>/ {formatAmount(capacity)}</span></dd>
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

      {game.batOwned && (
        <section className="passive-summary" aria-label="Vagabundos y producción">
          <dl>
            <div><dt>Vagabundos</dt><dd>{game.vagabonds} / {GAME_CONFIG.vagabonds.maxCount}</dd></div>
            <div><dt>Producción automática</dt><dd>{formatAmount(passiveRate)} latas/s</dd></div>
          </dl>
          <p>{passiveRate > 0 && game.cans >= capacity
            ? 'Producción en pausa: vende latas para liberar espacio.'
            : 'Las latas se acumulan automáticamente. La venta sigue siendo manual.'}</p>
        </section>
      )}

      <div className="workspace">
        <section className="panel work-panel" aria-labelledby="work-title">
          <div className="panel-heading">
            <h2 id="work-title">A pie de calle</h2>
            <span className="badge">{passiveRate > 0 ? 'Manual + automático' : 'Trabajo manual'}</span>
          </div>
          <p className="panel-description">Cada pequeño viaje cuenta.</p>

          <div className="work-step">
            <span className="step-number" aria-hidden="true">01</span>
            <div>
              <h3>Recoge latas</h3>
              <p id="collect-help">{currentTool
                ? `Tu ${currentTool.name.toLocaleLowerCase('es')} permite llevar hasta ${formatAmount(capacity)} latas.`
                : 'Dos manos, dos latas. Empieza recogiendo una por clic.'}</p>
            </div>
          </div>
          <button
            className="button button-primary collect-button"
            disabled={!canCollect(game)}
            aria-describedby="collect-help capacity-help"
            onClick={() => dispatch({ type: 'collect' })}
          >
            <span>Recoger latas</span>
            <span className="button-meta">{collectionAmount > 0 ? `+${formatAmount(collectionAmount)} / clic` : 'Sin espacio'}</span>
          </button>

          <div className="capacity-meter">
            <label htmlFor="carrying-capacity">Espacio ocupado <span>{formatAmount(game.cans)} / {formatAmount(capacity)} latas</span></label>
            <progress id="carrying-capacity" max={capacity} value={Math.min(game.cans, capacity)} />
            <p id="capacity-help">{game.cans > capacity
              ? 'Conservas latas de tu partida anterior. Véndelas para volver a recoger.'
              : game.cans === capacity
                ? 'Capacidad completa. Vende tus latas para liberar espacio.'
                : 'El último clic recoge solo las latas que caben.'}</p>
          </div>

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
          <p className="work-note">{passiveRate > 0
            ? 'Puedes seguir recogiendo a mano mientras los vagabundos producen latas.'
            : 'Por ahora trabajas solo: las latas se recogen con tus clics.'}</p>
        </section>

        <ProgressPanel game={game} dispatch={dispatch} />
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
      <p className="prototype-note">Prototipo 0.3 · Paso a paso, desde cero.</p>
    </main>
  )
}
