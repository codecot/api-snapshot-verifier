import React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'

export interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  description?: string
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  description,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {children}
      
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

// Form group for organizing fields
export interface FormGroupProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const FormGroup: React.FC<FormGroupProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Form actions footer
export interface FormActionsProps {
  primaryLabel?: string
  onPrimary?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  isLoading?: boolean
  align?: 'left' | 'right' | 'between'
  children?: React.ReactNode
}

export const FormActions: React.FC<FormActionsProps> = ({
  primaryLabel = 'Save',
  onPrimary,
  secondaryLabel = 'Cancel',
  onSecondary,
  isLoading,
  align = 'right',
  children
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={cn('flex gap-3 pt-4', alignmentClasses[align])}>
      {children}
    </div>
  )
}