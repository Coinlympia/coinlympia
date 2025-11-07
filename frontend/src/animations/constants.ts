export const DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
} as const;

export const EASING = {
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
  sharp: [0.4, 0, 0.6, 1] as [number, number, number, number],
} as const;

export const SPRING = {
  gentle: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 14,
  },
  wobbly: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 12,
  },
  stiff: {
    type: 'spring' as const,
    stiffness: 210,
    damping: 20,
  },
} as const;

export const DELAY = {
  none: 0,
  short: 50,
  medium: 100,
  long: 200,
} as const;

export const STAGGER = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const;

