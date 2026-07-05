import type { SubscriptionPlan, SubscriptionAddOn } from './featureRegistry.ts';

export type BillingCadence = 'monthly' | 'annual';

export interface PriceDisplay {
  plan: SubscriptionPlan;
  cadence: BillingCadence;
  /** Billing and localized amount are supplied by Bidller at runtime. */
  priceKey: string;
  /** Marketing shorthand only; never used as the charge interval. */
  weeklyEquivalentLabel?: string;
  recommended?: boolean;
}

export interface AddOnPriceDisplay {
  addOn: SubscriptionAddOn;
  cadence: BillingCadence;
  priceKey: string;
}

/**
 * Product policy:
 * - Never bill weekly.
 * - "About $1/week" may be shown only as an equivalent affordability cue.
 * - Free rendering is the evaluation path, so Personal requires no costly trial window.
 * - Bidller remains the source of truth for currency, tax, localized price and checkout.
 */
export const PLAN_PRICES: PriceDisplay[] = [
  {
    plan: 'personal',
    cadence: 'monthly',
    priceKey: 'standroids.personal.monthly',
    weeklyEquivalentLabel: 'about $1/week',
  },
  {
    plan: 'personal',
    cadence: 'annual',
    priceKey: 'standroids.personal.annual',
    weeklyEquivalentLabel: 'less than the monthly equivalent',
    recommended: true,
  },
  {
    plan: 'fellowship',
    cadence: 'monthly',
    priceKey: 'standroids.fellowship.monthly',
  },
  {
    plan: 'fellowship',
    cadence: 'annual',
    priceKey: 'standroids.fellowship.annual',
    recommended: true,
  },
  {
    plan: 'parish',
    cadence: 'monthly',
    priceKey: 'standroids.parish.monthly',
  },
  {
    plan: 'parish',
    cadence: 'annual',
    priceKey: 'standroids.parish.annual',
    recommended: true,
  },
];

export const ADD_ON_PRICES: AddOnPriceDisplay[] = [
  {
    addOn: 'scholar',
    cadence: 'monthly',
    priceKey: 'standroids.scholar.monthly',
  },
  {
    addOn: 'scholar',
    cadence: 'annual',
    priceKey: 'standroids.scholar.annual',
  },
];
