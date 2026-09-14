import type { Amount } from './amount'

export interface ToolUpgrade {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly purchaseLabel: string
  readonly cost: Amount
  readonly cansPerClick: Amount
  readonly capacity: Amount
}

export const GAME_CONFIG = {
  startingMoney: 0,
  canSalePrice: 10,
  hands: { name: 'Tus manos', capacity: 2, cansPerClick: 1 },
  bat: { name: 'Bate de béisbol', cost: 4000 },
  vagabonds: { hitsRequired: 10, recruitmentCost: 100, maxCount: 10, cansPerSecond: 1 },
  // Ordered purchases: toolLevel is the number of upgrades already owned.
  // Changes to this order need a save migration; prices can be balanced freely.
  toolUpgrades: [
    {
      id: 'basic-hook',
      name: 'Palo',
      description: 'Un palo con gancho para llevar más latas en cada viaje.',
      purchaseLabel: 'Comprar palo',
      cost: 100,
      cansPerClick: 1,
      capacity: 5,
    },
    {
      id: 'bag-hook',
      name: 'Palo con bolsa',
      description: 'Añade una bolsa al palo para transportar hasta veinte latas y recoger dos por clic.',
      purchaseLabel: 'Mejorar a palo con bolsa',
      cost: 500,
      cansPerClick: 2,
      capacity: 20,
    },
    {
      id: 'cart',
      name: 'Carrito',
      description: 'Transporta hasta cien latas. Sigues recogiendo con el palo con bolsa: dos latas por clic.',
      purchaseLabel: 'Comprar carrito',
      cost: 2000,
      cansPerClick: 2,
      capacity: 100,
    },
  ] as const satisfies readonly ToolUpgrade[],
} as const
