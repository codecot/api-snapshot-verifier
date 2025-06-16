/**
 * EmptyState Component
 * Displays helpful empty state messages with optional actions
 */

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'outline'
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'py-12 px-4 text-center',
      className
    )}>
      <div className="mb-4 p-4 rounded-full bg-muted/50">
        <Icon className="h-12 w-12 text-muted-foreground opacity-50" />
      </div>
      <h3 className="text-lg font-semibold mb-2 dark:text-muted-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'default'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}