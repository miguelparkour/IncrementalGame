import { GAME_CONFIG } from '../game/config'
import type { GameCommand } from '../game/engine'
import type { GameState } from '../game/state'
import { canHitVagabond, getPassiveCansPerSecond } from '../game/vagabonds'
import { formatAmount, formatMoney } from './format'

export function VagabondsPanel({ game, dispatch }: {
  game: GameState
  dispatch: (command: GameCommand) => void
}) {
  const { maxCount, hitsRequired, recruitmentCost, cansPerSecond } = GAME_CONFIG.vagabonds
  const atLimit = game.vagabonds >= maxCount
  const needsMoney = !atLimit && game.recruitHits === hitsRequired - 1 && game.money < recruitmentCost

  return (
    <>
      <h2>Vagabundos</h2>
      <p className="panel-description">Cada uno genera {formatAmount(cansPerSecond)} lata por segundo.</p>
      <div className="current-tool" role="status">
        <strong>{game.vagabonds} / {maxCount} vagabundos</strong>
        <span>Producción total: {formatAmount(getPassiveCansPerSecond(game))} latas/s</span>
      </div>
      {atLimit ? (
        <div className="upgrade complete" role="status">
          <h3>Has alcanzado el máximo.</h3>
          <p>Ya tienes {maxCount} vagabundos. Vende las latas para que puedan seguir produciendo.</p>
        </div>
      ) : (
        <div className="upgrade">
          <p className="eyebrow">CONSEGUIR OTRO VAGABUNDO</p>
          <h3>Convéncelo con el bate</h3>
          <p>Necesita {hitsRequired} golpes. Al completar el último, obtienes un vagabundo y se descuentan {formatMoney(recruitmentCost)}.</p>
          <div className="capacity-meter">
            <label htmlFor="recruit-progress">Golpes dados <span>{game.recruitHits} / {hitsRequired}</span></label>
            <progress id="recruit-progress" max={hitsRequired} value={game.recruitHits} />
          </div>
          <button
            className="button button-primary"
            disabled={!canHitVagabond(game)}
            aria-describedby="recruit-help"
            onClick={() => dispatch({ type: 'hit-vagabond' })}
          >
            <span>Dar un golpe con el bate</span>
            <span className="button-meta">+1 golpe</span>
          </button>
          <p id="recruit-help" className="purchase-hint">{needsMoney
            ? `Necesitas ${formatMoney(recruitmentCost)} para el último golpe. Vende latas; conservarás los golpes dados.`
            : `Coste al completarlo: ${formatMoney(recruitmentCost)}. El siguiente empieza con 0 golpes.`}</p>
        </div>
      )}
      <p className="work-note">La producción comparte el espacio de tus latas. Se detiene al llenarse y continúa cuando vendes.</p>
    </>
  )
}
