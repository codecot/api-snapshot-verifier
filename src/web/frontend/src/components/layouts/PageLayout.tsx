import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface PageLayoutProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumb?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  actions,
  breadcrumb = true,
  loading = false,
  children,
  className
}) => {
  const navigate = useNavigate()

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {breadcrumb && (
            <>
              <button
                onClick={() => navigate('/')}
                className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Go to dashboard"
              >
                <Home className="h-4 w-4" />
              </button>
              <span className="text-lg text-muted-foreground shrink-0">/</span>
            </>
          )}
          
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="truncate">{title}</span>
              {loading && (
                <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin text-blue-600 shrink-0" />
              )}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

// Section component for consistent spacing
export interface PageSectionProps {
  children: React.ReactNode
  className?: string
}

export const PageSection: React.FC<PageSectionProps> = ({ children, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  )
}

// Grid layout for cards
export interface PageGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export const PageGrid: React.FC<PageGridProps> = ({ 
  children, 
  columns = 1,
  className 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  )
}