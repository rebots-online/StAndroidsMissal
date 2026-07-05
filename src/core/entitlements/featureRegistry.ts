export type SubscriptionTier = 'free' | 'fellowship' | 'parish' | 'scholar';

export type FeatureId =
  | 'read.mass'
  | 'read.office'
  | 'calendar.perpetual'
  | 'themes.all'
  | 'accessibility.all'
  | 'annotations.local'
  | 'share.url'
  | 'share.printPdf'
  | 'share.markdownHtmlJson'
  | 'ecclesidraw.export'
  | 'collections.large'
  | 'collaboration.live'
  | 'collaboration.versionHistory'
  | 'newsletter.compose'
  | 'newsletter.schedule'
  | 'workspace.fellowship'
  | 'workspace.parish'
  | 'workspace.roles'
  | 'workspace.moderation'
  | 'research.semanticAdvanced'
  | 'research.aiExegesis'
  | 'sync.crossDevice';

export interface FeatureDefinition {
  id: FeatureId;
  title: string;
  description: string;
  minimumTier: SubscriptionTier;
  localFirst: boolean;
  costDriver: 'none' | 'storage' | 'compute' | 'collaboration' | 'delivery';
}

const TIER_ORDER: SubscriptionTier[] = ['free', 'fellowship', 'parish', 'scholar'];

export const FEATURES: FeatureDefinition[] = [
  { id: 'read.mass', title: 'Read the Mass', description: 'Bilingual Mass texts and navigation.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'read.office', title: 'Read the Divine Office', description: 'The Office cursus and available texts.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'calendar.perpetual', title: 'Perpetual calendar', description: 'On-device liturgical date resolution.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'themes.all', title: 'All interface aesthetics', description: 'Traditional, modernist, glass, skeuomorphic, retro, brutalist, dopamine and future skins.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'accessibility.all', title: 'All accessibility and legibility controls', description: 'Font size, contrast, spacing, light and dark modes, reduced motion, and guided presentation.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'annotations.local', title: 'Local annotations', description: 'Highlights and notes stored on the device.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'share.url', title: 'Self-contained annotated links', description: 'Passage, references and notes encoded directly into the URL fragment.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'share.printPdf', title: 'Print and PDF', description: 'Clean printing and browser PDF output.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'share.markdownHtmlJson', title: 'Portable exports', description: 'Markdown, standalone HTML and JSON bundles.', minimumTier: 'free', localFirst: true, costDriver: 'none' },
  { id: 'ecclesidraw.export', title: 'EcclesiDraw export', description: 'Open a selected passage and annotations as an Excalidraw-compatible canvas.', minimumTier: 'free', localFirst: true, costDriver: 'none' },

  { id: 'collections.large', title: 'Large shared collections', description: 'Organize and share substantial annotated corpora.', minimumTier: 'fellowship', localFirst: false, costDriver: 'storage' },
  { id: 'collaboration.live', title: 'Live collaboration', description: 'Multi-user notes and EcclesiDraw sessions.', minimumTier: 'fellowship', localFirst: false, costDriver: 'collaboration' },
  { id: 'collaboration.versionHistory', title: 'Version history', description: 'Recover and compare revisions of shared work.', minimumTier: 'fellowship', localFirst: false, costDriver: 'storage' },
  { id: 'newsletter.compose', title: 'Newsletter composition', description: 'Turn shared passages and notes into reusable newsletter blocks.', minimumTier: 'fellowship', localFirst: false, costDriver: 'none' },
  { id: 'workspace.fellowship', title: 'Fellowship workspace', description: 'A small shared space for study groups and apostolates.', minimumTier: 'fellowship', localFirst: false, costDriver: 'collaboration' },
  { id: 'sync.crossDevice', title: 'Cross-device sync', description: 'Synchronize annotations, preferences and collections.', minimumTier: 'fellowship', localFirst: false, costDriver: 'storage' },

  { id: 'workspace.parish', title: 'Parish workspace', description: 'Parish-scale shared library, publishing and member access.', minimumTier: 'parish', localFirst: false, costDriver: 'collaboration' },
  { id: 'workspace.roles', title: 'Roles and permissions', description: 'Editors, reviewers, clergy approval and publication roles.', minimumTier: 'parish', localFirst: false, costDriver: 'collaboration' },
  { id: 'workspace.moderation', title: 'Moderation and approval', description: 'Review queues, publication gates and audit history.', minimumTier: 'parish', localFirst: false, costDriver: 'collaboration' },
  { id: 'newsletter.schedule', title: 'Scheduled newsletter delivery', description: 'Publish and deliver approved parish content on a schedule.', minimumTier: 'parish', localFirst: false, costDriver: 'delivery' },

  { id: 'research.semanticAdvanced', title: 'Advanced semantic research', description: 'Larger indexes, richer embeddings and cross-corpus research tools.', minimumTier: 'scholar', localFirst: false, costDriver: 'compute' },
  { id: 'research.aiExegesis', title: 'Grounded AI exegesis', description: 'Ecclesiastical Latin and Catholic doctrine assistance grounded in the corpus.', minimumTier: 'scholar', localFirst: false, costDriver: 'compute' },
];

export function hasFeature(tier: SubscriptionTier, featureId: FeatureId): boolean {
  const feature = FEATURES.find((item) => item.id === featureId);
  if (!feature) return false;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(feature.minimumTier);
}

export function featuresForTier(tier: SubscriptionTier): FeatureDefinition[] {
  return FEATURES.filter((feature) => hasFeature(tier, feature.id));
}
