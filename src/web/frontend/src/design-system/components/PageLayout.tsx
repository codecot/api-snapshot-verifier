/**
 * PageLayout Component
 * Provides consistent page structure and spacing
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { componentSpacing } from '../tokens'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl', 
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-[1536px]',
  full: 'max-w-full',
}

export function PageLayout({ 
  children, 
  className,
  maxWidth = 'xl'
}: PageLayoutProps) {
  return (
    <div 
      className={cn(
        'mx-auto w-full',
        'px-4 sm:px-6 lg:px-8', // Responsive padding
        'py-6 sm:py-8',         // Vertical padding
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  )
}