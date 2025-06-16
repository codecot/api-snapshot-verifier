/**
 * Theme Provider
 * Integrates design tokens with the application's theme system
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  palette, 
  semanticColors, 
  shadows, 
  darkShadows,
  borderRadius,
  spacing,
  typography
} from '../tokens'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to system
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system'
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Apply theme class to document root
  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const applyTheme = () => {
      let resolved: 'light' | 'dark' = 'light'
      
      if (theme === 'system') {
        resolved = mediaQuery.matches ? 'dark' : 'light'
      } else {
        resolved = theme as 'light' | 'dark'
      }
      
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      setResolvedTheme(resolved)
      
      // Apply design token CSS variables
      applyDesignTokens(resolved)
    }
    
    applyTheme()
    
    // Listen for system theme changes
    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme)
      return () => mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Apply design tokens as CSS variables
function applyDesignTokens(theme: 'light' | 'dark') {
  const root = document.documentElement
  
  // Color tokens
  const colors = theme === 'dark' ? {
    // Dark mode colors
    '--color-background': palette.gray[950],
    '--color-foreground': palette.gray[50],
    '--color-card': palette.gray[900],
    '--color-card-foreground': palette.gray[50],
    '--color-muted': palette.gray[800],
    '--color-muted-foreground': palette.gray[400],
    '--color-accent': palette.gray[800],
    '--color-accent-foreground': palette.gray[50],
    '--color-border': palette.gray[800],
    '--color-border-muted': `${palette.gray[700]}30`,
    '--color-border-emphasis': palette.gray[600],
  } : {
    // Light mode colors
    '--color-background': palette.gray[50],
    '--color-foreground': palette.gray[900],
    '--color-card': 'white',
    '--color-card-foreground': palette.gray[900],
    '--color-muted': palette.gray[100],
    '--color-muted-foreground': palette.gray[500],
    '--color-accent': palette.gray[100],
    '--color-accent-foreground': palette.gray[900],
    '--color-border': palette.gray[200],
    '--color-border-muted': `${palette.gray[300]}50`,
    '--color-border-emphasis': palette.gray[400],
  }
  
  // Apply color variables
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  
  // Spacing tokens
  Object.entries(spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value)
  })
  
  // Shadow tokens
  const shadowTokens = theme === 'dark' ? darkShadows : shadows
  Object.entries(shadowTokens).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value)
  })
  
  // Border radius tokens
  Object.entries(borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value)
  })
  
  // Typography tokens
  root.style.setProperty('--font-sans', typography.fontFamily.sans.join(', '))
  root.style.setProperty('--font-mono', typography.fontFamily.mono.join(', '))
}