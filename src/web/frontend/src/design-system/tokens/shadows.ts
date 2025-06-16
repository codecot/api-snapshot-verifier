/**
 * Shadow Design Tokens
 * Defines elevation levels and shadow styles
 */

export const shadows = {
  // Base shadows for elevation levels
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const

// Dark mode shadows (with colored tints)
export const darkShadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
  none: 'none',
} as const

// Component-specific shadows
export const componentShadows = {
  // Card elevations
  card: {
    rest: shadows.sm,
    hover: shadows.md,
    active: shadows.DEFAULT,
  },
  
  // Button shadows
  button: {
    rest: 'none',
    hover: shadows.sm,
    active: 'none',
    focus: '0 0 0 3px rgb(59 130 246 / 0.5)',
  },
  
  // Dropdown/Popover shadows
  dropdown: shadows.lg,
  popover: shadows.lg,
  
  // Modal/Dialog shadows
  modal: shadows['2xl'],
  
  // Toast/Notification shadows
  toast: shadows.lg,
  
  // Input focus shadow
  inputFocus: '0 0 0 3px rgb(59 130 246 / 0.1)',
} as const

// Elevation scale for consistent depth
export const elevation = {
  0: 'none',
  1: shadows.sm,
  2: shadows.DEFAULT,
  3: shadows.md,
  4: shadows.lg,
  5: shadows.xl,
  6: shadows['2xl'],
} as const

export type Shadows = typeof shadows
export type DarkShadows = typeof darkShadows
export type ComponentShadows = typeof componentShadows
export type Elevation = typeof elevation