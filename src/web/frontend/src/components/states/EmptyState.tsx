import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-10 w-10',
    title: 'text-lg',
    description: 'text-sm'
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-xl',
    description: 'text-base'
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-2xl',
    description: 'text-lg'
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md'
}) => {
  const sizes = sizeClasses[size]

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizes.container,
      className
    )}>
      {Icon && (
        <Icon className={cn('text-muted-foreground mb-4', sizes.icon)} />
      )}
      
      <h3 className={cn('font-semibold', sizes.title)}>{title}</h3>
      
      {description && (
        <p className={cn('text-muted-foreground mt-2 max-w-md', sizes.description)}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex gap-3 mt-6">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Specialized empty states
export const NoDataEmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    title="No data yet"
    description="There's no data to display at the moment"
    action={onRefresh ? {
      label: 'Refresh',
      onClick: onRefresh,
      variant: 'outline'
    } : undefined}
  />
)

export const ErrorEmptyState: React.FC<{ 
  error?: string
  onRetry?: () => void 
}> = ({ error, onRetry }) => (
  <EmptyState
    title="Something went wrong"
    description={error || "We couldn't load the data. Please try again."}
    action={onRetry ? {
      label: 'Retry',
      onClick: onRetry,
      variant: 'default'
    } : undefined}
  />
)

export const SearchEmptyState: React.FC<{ 
  searchTerm: string
  onClear?: () => void 
}> = ({ searchTerm, onClear }) => (
  <EmptyState
    title="No results found"
    description={`No results found for "${searchTerm}"`}
    action={onClear ? {
      label: 'Clear search',
      onClick: onClear,
      variant: 'outline'
    } : undefined}
    size="sm"
  />
)