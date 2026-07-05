export type Experience = 'guided' | 'scholar';
export type Mode = 'system' | 'light' | 'dark';

export const AESTHETICS = [
  { id: 'traditional', label: 'Traditional' },
  { id: 'modernist', label: 'Modernist' },
  { id: 'austere', label: 'Austere' },
  { id: 'glass-acrylic', label: 'Glass · Acrylic' },
  { id: 'glass-clear', label: 'Glass · Clear' },
  { id: 'skeuomorphic', label: 'Skeuomorphic' },
  { id: 'retro', label: 'Retro-futurist' },
  { id: 'brutalist', label: 'Brutalist' },
  { id: 'dopamine', label: 'Dopamine' },
  { id: 'anti-design', label: 'Anti-design' },
] as const;

export type Aesthetic = (typeof AESTHETICS)[number]['id'];

export const EXPERIENCES: { id: Experience; label: string }[] = [
  { id: 'guided', label: 'Guided' },
  { id: 'scholar', label: 'Scholar' },
];

export const MODES: { id: Mode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];
