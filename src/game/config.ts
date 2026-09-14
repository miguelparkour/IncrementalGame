import type { Amount } from './amount'

export interface ToolUpgrade {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly cost: Amount
  readonly cansPerClick: Amount
}

export const GAME_CONFIG = {
  startingMoney: 100,
  canSalePrice: 10,
  // Ordered purchases: toolLevel is the number of upgrades already owned.
  // Changes to this order need a save migration; prices can be balanced freely.
  toolUpgrades: [
    {
      id: 'basic-hook',
      name: 'Palo con gancho',
      description: 'Una herramienta sencilla para recoger tus primeras latas.',
      cost: 100,
      cansPerClick: 1,
    },
    {
      id: 'reinforced-hook',
      name: 'Gancho reforzado',
      description: 'Un agarre más firme para recoger dos latas en cada viaje.',
      cost: 500,
      cansPerClick: 2,
    },
  ] satisfies readonly ToolUpgrade[],
} as const
