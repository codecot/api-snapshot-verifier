/**
 * Spacing Design Tokens
 * Defines consistent spacing scale for margins, paddings, and gaps
 */

// Base spacing unit (4px)
const SPACING_UNIT = 4

// Spacing scale based on 4px grid
export const spacing = {
  0: '0',
  px: '1px',
  0.5: `${SPACING_UNIT * 0.5}px`,   // 2px
  1: `${SPACING_UNIT * 1}px`,       // 4px
  1.5: `${SPACING_UNIT * 1.5}px`,   // 6px
  2: `${SPACING_UNIT * 2}px`,       // 8px
  2.5: `${SPACING_UNIT * 2.5}px`,   // 10px
  3: `${SPACING_UNIT * 3}px`,       // 12px
  3.5: `${SPACING_UNIT * 3.5}px`,   // 14px
  4: `${SPACING_UNIT * 4}px`,       // 16px
  5: `${SPACING_UNIT * 5}px`,       // 20px
  6: `${SPACING_UNIT * 6}px`,       // 24px
  7: `${SPACING_UNIT * 7}px`,       // 28px
  8: `${SPACING_UNIT * 8}px`,       // 32px
  9: `${SPACING_UNIT * 9}px`,       // 36px
  10: `${SPACING_UNIT * 10}px`,     // 40px
  11: `${SPACING_UNIT * 11}px`,     // 44px
  12: `${SPACING_UNIT * 12}px`,     // 48px
  14: `${SPACING_UNIT * 14}px`,     // 56px
  16: `${SPACING_UNIT * 16}px`,     // 64px
  20: `${SPACING_UNIT * 20}px`,     // 80px
  24: `${SPACING_UNIT * 24}px`,     // 96px
  28: `${SPACING_UNIT * 28}px`,     // 112px
  32: `${SPACING_UNIT * 32}px`,     // 128px
  36: `${SPACING_UNIT * 36}px`,     // 144px
  40: `${SPACING_UNIT * 40}px`,     // 160px
  44: `${SPACING_UNIT * 44}px`,     // 176px
  48: `${SPACING_UNIT * 48}px`,     // 192px
  52: `${SPACING_UNIT * 52}px`,     // 208px
  56: `${SPACING_UNIT * 56}px`,     // 224px
  60: `${SPACING_UNIT * 60}px`,     // 240px
  64: `${SPACING_UNIT * 64}px`,     // 256px
  72: `${SPACING_UNIT * 72}px`,     // 288px
  80: `${SPACING_UNIT * 80}px`,     // 320px
  96: `${SPACING_UNIT * 96}px`,     // 384px
} as const

// Component-specific spacing presets
export const componentSpacing = {
  // Page layout
  page: {
    padding: spacing[6],           // 24px
    paddingMobile: spacing[4],     // 16px
    maxWidth: '1280px',
  },
  
  // Card spacing
  card: {
    padding: spacing[6],           // 24px
    paddingCompact: spacing[4],    // 16px
    gap: spacing[4],               // 16px
  },
  
  // Form spacing
  form: {
    fieldGap: spacing[6],          // 24px
    labelGap: spacing[2],          // 8px
    sectionGap: spacing[8],        // 32px
  },
  
  // Button spacing
  button: {
    paddingX: spacing[4],          // 16px
    paddingY: spacing[2],          // 8px
    gap: spacing[2],               // 8px
    groupGap: spacing[3],          // 12px
  },
  
  // Table spacing
  table: {
    cellPaddingX: spacing[4],      // 16px
    cellPaddingY: spacing[3],      // 12px
    headerPaddingY: spacing[4],    // 16px
  },
  
  // List spacing
  list: {
    itemGap: spacing[3],           // 12px
    sectionGap: spacing[6],        // 24px
  },
} as const

// Layout grid
export const grid = {
  columns: 12,
  gap: spacing[6],                 // 24px
  gapMobile: spacing[4],           // 16px
} as const

export type Spacing = typeof spacing
export type ComponentSpacing = typeof componentSpacing
export type Grid = typeof grid