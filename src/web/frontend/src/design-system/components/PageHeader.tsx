/**
 * PageHeader Component
 * Consistent page header with title, description, and actions
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { typographyPresets, spacing } from '../tokens'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  badge?: React.ReactNode
}

export function PageHeader({ 
  title, 
  description, 
  actions,
  className,
  badge
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 
              className="text-2xl font-bold tracking-tight text-foreground dark:text-muted-foreground"
              style={{
                fontSize: typographyPresets.h2.fontSize[0],
                fontWeight: typographyPresets.h2.fontWeight,
                letterSpacing: typographyPresets.h2.letterSpacing,
              }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p 
              className="mt-2 text-muted-foreground"
              style={{
                fontSize: typographyPresets.body.fontSize[0],
                lineHeight: typographyPresets.body.lineHeight,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="ml-4 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}