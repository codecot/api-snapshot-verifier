/**
 * StatCard Component
 * Displays statistics with icon, value, and label
 */

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  trend?: {
    value: number
    label: string
  }
  onClick?: () => void
  className?: string
  iconClassName?: string
}

export function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  onClick,
  className,
  iconClassName
}: StatCardProps) {
  return (
    <Card
      hoverable={!!onClick}
      clickable={!!onClick}
      onClick={onClick}
      className={className}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-2xl font-bold dark:text-muted-foreground">
            {value}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {label}
          </p>
          {trend && (
            <p className={cn(
              'text-xs mt-2',
              trend.value > 0 ? 'text-green-600 dark:text-green-400' : 
              trend.value < 0 ? 'text-red-600 dark:text-red-400' : 
              'text-muted-foreground'
            )}>
              {trend.value > 0 && '+'}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn(
          'ml-4 p-3 rounded-full',
          'bg-muted dark:bg-muted/50',
          iconClassName
        )}>
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </Card>
  )
}