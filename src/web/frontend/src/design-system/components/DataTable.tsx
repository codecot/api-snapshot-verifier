/**
 * DataTable Component
 * Reusable table with consistent styling
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { componentBorders, componentSpacing } from '../tokens'

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => React.ReactNode)
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  className?: string
  onRowClick?: (item: T) => void
}

export function DataTable<T>({ 
  columns, 
  data, 
  className,
  onRowClick 
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'text-left font-medium text-muted-foreground',
                  'px-4 py-3',
                  column.className
                )}
                style={{
                  paddingLeft: componentSpacing.table.cellPaddingX,
                  paddingRight: componentSpacing.table.cellPaddingX,
                  paddingTop: componentSpacing.table.headerPaddingY,
                  paddingBottom: componentSpacing.table.headerPaddingY,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'border-b last:border-b-0',
                'transition-colors',
                onRowClick && [
                  'cursor-pointer',
                  'hover:bg-muted/50'
                ]
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    'px-4 py-3',
                    column.className
                  )}
                  style={{
                    paddingLeft: componentSpacing.table.cellPaddingX,
                    paddingRight: componentSpacing.table.cellPaddingX,
                    paddingTop: componentSpacing.table.cellPaddingY,
                    paddingBottom: componentSpacing.table.cellPaddingY,
                  }}
                >
                  {typeof column.accessor === 'function'
                    ? column.accessor(item)
                    : (item[column.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  )
}