export type SubscriptionPlan = 'free' | 'personal' | 'fellowship' | 'parish';
export type SubscriptionAddOn = 'scholar';

export interface EntitlementState {
  plan: SubscriptionPlan;
  addOns: SubscriptionAddOn[];
}

export type FeatureId =
  | 'read.mass'
  | 'read.office'
  | 'calendar.perpetual'
  | 'themes.all'
  | 'accessibility.all'
  | 'share.consume'
  | 'annotations.local'
  | 'journal.personal'
  | 'share.composeUrl'
  | 'share.printPdf'
  | 'share.portable'
  | 'ecclesidraw.export'
  | 'collaboration.exchange'
  | 'sync.private'
  | 'collections.private'
  | 'history.private'
  | 'research.personal'
  | 'collaboration.live'
  | 'collaboration.history'
  | 'newsletter.compose'
  | 'workspace.fellowship'
  | 'workspace.parish'
  | 'workspace.roles'
  | 'workspace.moderation'
  | 'newsletter.schedule'
  | 'research.advanced'
  | 'research.assisted';

export interface FeatureDefinition {
  id: FeatureId;
  title: string;
  description: string;
  minimumPlan?: SubscriptionPlan;
  requiredAddOn?: SubscriptionAddOn;
  localFirst: boolean;
  costDriver: 'none' | 'storage' | 'compute' | 'collaboration' | 'delivery';
}

const PLAN_ORDER: SubscriptionPlan[] = ['free', 'personal', 'fellowship', 'parish'];

export const FEATURES: FeatureDefinition[] = [
  { id: 'read.mass', title: 'Render the Mass', description: 'Bilingual Mass texts and navigation.', minimumPlan: 'free', localFirst: true, costDriver: 'none' },
  { id: 'read.office', title: 'Render the Divine Office', description: 'The Office cursus and available texts.', minimumPlan: 'free', localFirst: true, costDriver: 'none' },
  { id: 'calendar.perpetual', title: 'Perpetual calendar', description: 'On-device liturgical date resolution.', minimumPlan: 'free', localFirst: true, costDriver: 'none' },
  { id: 'themes.all', title: 'All interface aesthetics', description: 'All skins and future skins.', minimumPlan: 'free', localFirst: true, costDriver: 'none' },
  { id: 'accessibility.all', title: 'All legibility controls', description: 'Typography, contrast, spacing, motion and light modes.', minimumPlan: 'free', localFirst: true, costDriver: 'none' },
  { id: 'share.consume', title: 'Open shared passages', description: 'Anyone can open and read a self-contained shared passage without an account.', minimumPlan: 'free', localFirst: true, costDriver: 'none' },

  { id: 'annotations.local', title: 'Highlights and annotations', description: 'Content-anchored highlights and notes stored on the device.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'journal.personal', title: 'Personal liturgical journal', description: 'Private dated reflections connected to days, sections and passages.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'share.composeUrl', title: 'Compose annotated links', description: 'Encode passage, references and chosen notes directly in the URL fragment.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'share.printPdf', title: 'Print and PDF', description: 'Clean printing and browser PDF output of composed material.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'share.portable', title: 'Portable exports', description: 'Markdown, standalone HTML and JSON bundles.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'ecclesidraw.export', title: 'EcclesiDraw export', description: 'Excalidraw-compatible canvas export.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'collaboration.exchange', title: 'Parcel collaboration', description: 'Exchange and revise self-contained annotated bundles without a hosted workspace.', minimumPlan: 'personal', localFirst: true, costDriver: 'none' },
  { id: 'sync.private', title: 'Private cross-device sync', description: 'Synchronize personal notes, preferences and collections.', minimumPlan: 'personal', localFirst: false, costDriver: 'storage' },
  { id: 'collections.private', title: 'Large private collections', description: 'Substantial personal study collections without an institutional workspace.', minimumPlan: 'personal', localFirst: false, costDriver: 'storage' },
  { id: 'history.private', title: 'Personal version history', description: 'Recover revisions of private notes and study documents.', minimumPlan: 'personal', localFirst: false, costDriver: 'storage' },
  { id: 'research.personal', title: 'Enhanced personal research', description: 'Richer search and a modest assisted-research allowance.', minimumPlan: 'personal', localFirst: false, costDriver: 'compute' },

  { id: 'collaboration.live', title: 'Live collaboration', description: 'Concurrent multi-user notes and EcclesiDraw sessions.', minimumPlan: 'fellowship', localFirst: false, costDriver: 'collaboration' },
  { id: 'collaboration.history', title: 'Shared version history', description: 'Recover and compare group revisions.', minimumPlan: 'fellowship', localFirst: false, costDriver: 'storage' },
  { id: 'newsletter.compose', title: 'Newsletter composition', description: 'Reusable newsletter blocks from shared passages and notes.', minimumPlan: 'fellowship', localFirst: false, costDriver: 'none' },
  { id: 'workspace.fellowship', title: 'Fellowship workspace', description: 'A shared space for study groups and apostolates.', minimumPlan: 'fellowship', localFirst: false, costDriver: 'collaboration' },

  { id: 'workspace.parish', title: 'Parish workspace', description: 'Parish-scale library, publishing and member access.', minimumPlan: 'parish', localFirst: false, costDriver: 'collaboration' },
  { id: 'workspace.roles', title: 'Roles and permissions', description: 'Editors, reviewers and publication roles.', minimumPlan: 'parish', localFirst: false, costDriver: 'collaboration' },
  { id: 'workspace.moderation', title: 'Moderation and approval', description: 'Review queues, publication gates and audit history.', minimumPlan: 'parish', localFirst: false, costDriver: 'collaboration' },
  { id: 'newsletter.schedule', title: 'Scheduled delivery', description: 'Publish approved content on a schedule.', minimumPlan: 'parish', localFirst: false, costDriver: 'delivery' },

  { id: 'research.advanced', title: 'Advanced semantic research', description: 'Larger indexes and cross-corpus research.', requiredAddOn: 'scholar', localFirst: false, costDriver: 'compute' },
  { id: 'research.assisted', title: 'High-volume grounded assistance', description: 'Higher-volume assisted research grounded in the corpus.', requiredAddOn: 'scholar', localFirst: false, costDriver: 'compute' },
];

export const FREE_ENTITLEMENTS: EntitlementState = { plan: 'free', addOns: [] };

export function hasFeature(state: EntitlementState, featureId: FeatureId): boolean {
  const feature = FEATURES.find((item) => item.id === featureId);
  if (!feature) return false;
  const planOk = feature.minimumPlan
    ? PLAN_ORDER.indexOf(state.plan) >= PLAN_ORDER.indexOf(feature.minimumPlan)
    : true;
  const addOnOk = feature.requiredAddOn
    ? state.addOns.includes(feature.requiredAddOn)
    : true;
  return planOk && addOnOk;
}

export function featuresForEntitlements(state: EntitlementState): FeatureDefinition[] {
  return FEATURES.filter((feature) => hasFeature(state, feature.id));
}
