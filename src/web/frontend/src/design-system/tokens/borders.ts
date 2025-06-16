/**
 * Border Design Tokens
 * Defines border widths, styles, and radii
 */

import { palette } from './colors'

// Border widths
export const borderWidth = {
  0: '0px',
  DEFAULT: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const

// Border styles
export const borderStyle = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
  none: 'none',
} as const

// Border radius scale
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
} as const

// Border colors (semantic)
export const borderColors = {
  DEFAULT: 'var(--border)',
  muted: `${palette.gray[300]}50`,
  emphasis: palette.gray[400],
  
  // Interactive states
  hover: palette.gray[400],
  focus: palette.primary[500],
  active: palette.primary[600],
  
  // Status borders
  success: palette.success[500],
  warning: palette.warning[500],
  error: palette.error[500],
  info: palette.primary[500],
  
  // Dark mode variants
  dark: {
    DEFAULT: 'var(--border)',
    muted: `${palette.gray[700]}30`,
    emphasis: palette.gray[600],
    hover: palette.gray[600],
    focus: palette.primary[400],
    active: palette.primary[500],
  },
} as const

// Component-specific border styles
export const componentBorders = {
  // Card borders
  card: {
    width: borderWidth.DEFAULT,
    style: borderStyle.solid,
    color: borderColors.DEFAULT,
    radius: borderRadius.lg,
  },
  
  // Input borders
  input: {
    width: borderWidth.DEFAULT,
    style: borderStyle.solid,
    color: borderColors.DEFAULT,
    radius: borderRadius.md,
    focus: {
      width: borderWidth[2],
      color: borderColors.focus,
    },
  },
  
  // Button borders
  button: {
    width: borderWidth.DEFAULT,
    style: borderStyle.solid,
    radius: borderRadius.md,
  },
  
  // Table borders
  table: {
    width: borderWidth.DEFAULT,
    style: borderStyle.solid,
    color: borderColors.muted,
  },
  
  // Divider
  divider: {
    width: borderWidth.DEFAULT,
    style: borderStyle.solid,
    color: borderColors.muted,
  },
} as const

// Border utilities
export const borderUtils = {
  // Focus rings
  focusRing: {
    width: '3px',
    style: 'solid',
    color: `${palette.primary[500]}50`,
    offset: '2px',
  },
  
  // Transparent borders for layout stability
  transparent: {
    width: borderWidth.DEFAULT,
    style: borderStyle.solid,
    color: 'transparent',
  },
} as const

export type BorderWidth = typeof borderWidth
export type BorderStyle = typeof borderStyle
export type BorderRadius = typeof borderRadius
export type BorderColors = typeof borderColors
export type ComponentBorders = typeof componentBorders
export type BorderUtils = typeof borderUtils