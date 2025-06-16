/**
 * Card Component
 * Reusable card with consistent styling and hover effects
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { componentSpacing, componentShadows, componentBorders } from '../tokens'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  clickable?: boolean
  onClick?: () => void
  padding?: 'default' | 'compact' | 'none'
}

const paddingClasses = {
  default: 'p-6',
  compact: 'p-4',
  none: 'p-0'
}

export function Card({ 
  children, 
  className,
  hoverable = false,
  clickable = false,
  onClick,
  padding = 'default'
}: CardProps) {
  const Component = clickable ? 'button' : 'div'
  
  return (
    <Component
      className={cn(
        'rounded-lg border bg-card text-card-foreground',
        'transition-all duration-200',
        paddingClasses[padding],
        hoverable && [
          'hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20',
          'hover:-translate-y-0.5',
          'hover:bg-white/50 dark:hover:bg-white/5',
          'hover:backdrop-blur-sm',
          'hover:border-blue-500/50 dark:hover:border-blue-400/50'
        ],
        clickable && [
          'cursor-pointer',
          'w-full text-left',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        ],
        className
      )}
      onClick={onClick}
      style={{
        borderWidth: componentBorders.card.width,
        borderStyle: componentBorders.card.style,
        borderRadius: componentBorders.card.radius,
        boxShadow: componentShadows.card.rest,
      }}
    >
      {children}
    </Component>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold', className)}>
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t', className)}>
      {children}
    </div>
  )
}