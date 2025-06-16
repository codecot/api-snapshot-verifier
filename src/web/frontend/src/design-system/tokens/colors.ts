/**
 * Color Design Tokens
 * Defines the color palette and semantic color mappings
 */

// Base color palette
export const palette = {
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Primary colors (blue)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Success colors (green)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Warning colors (yellow)
  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
  
  // Error colors (red)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
} as const

// Semantic colors
export const semanticColors = {
  // Background colors
  background: {
    primary: 'var(--background)',
    secondary: 'var(--card)',
    accent: 'var(--accent)',
    muted: 'var(--muted)',
  },
  
  // Text colors
  text: {
    primary: 'var(--foreground)',
    secondary: 'var(--muted-foreground)',
    inverse: 'var(--primary-foreground)',
  },
  
  // Border colors
  border: {
    default: 'var(--border)',
    muted: 'var(--border-muted)',
    emphasis: 'var(--border-emphasis)',
  },
  
  // Interactive states
  interactive: {
    hover: 'var(--hover)',
    active: 'var(--active)',
    focus: 'var(--focus)',
  },
  
  // Status colors
  status: {
    success: palette.success[600],
    warning: palette.warning[600],
    error: palette.error[600],
    info: palette.primary[600],
  },
} as const

// Environment-specific colors
export const environmentColors = {
  production: {
    border: `${palette.error[300]}50`,
    borderDark: `${palette.error[600]}30`,
    text: palette.error[700],
    textDark: palette.error[400],
    background: palette.error[50],
    backgroundDark: `${palette.error[900]}20`,
  },
  staging: {
    border: `${palette.warning[300]}50`,
    borderDark: `${palette.warning[600]}30`,
    text: palette.warning[700],
    textDark: palette.warning[400],
    background: palette.warning[50],
    backgroundDark: `${palette.warning[900]}20`,
  },
  development: {
    border: `${palette.success[300]}50`,
    borderDark: `${palette.success[600]}30`,
    text: palette.success[700],
    textDark: palette.success[400],
    background: palette.success[50],
    backgroundDark: `${palette.success[900]}20`,
  },
  default: {
    border: `${palette.primary[300]}50`,
    borderDark: `${palette.primary[600]}30`,
    text: palette.primary[700],
    textDark: palette.primary[400],
    background: palette.primary[50],
    backgroundDark: `${palette.primary[900]}20`,
  },
} as const

export type ColorPalette = typeof palette
export type SemanticColors = typeof semanticColors
export type EnvironmentColors = typeof environmentColors