import React from 'react'
import { cn } from '@/utils/cn'
import { LoadingState, TableRowSkeleton } from '@/components/states/LoadingState'
import { EmptyState, SearchEmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Checkbox } from '@/components/ui/checkbox'

export interface Column<T> {
  key: string
  header: string | React.ReactNode
  accessor: (item: T) => React.ReactNode
  className?: string
  sortable?: boolean
  width?: string
}

export interface DataTableProps<T> {
  data?: T[]
  columns: Column<T>[]
  loading?: boolean
  error?: Error | null
  emptyState?: React.ReactNode
  searchTerm?: string
  onSearchClear?: () => void
  selectable?: boolean
  selectedItems?: Set<string>
  onSelectionChange?: (items: Set<string>) => void
  getItemId: (item: T) => string
  onRowClick?: (item: T) => void
  className?: string
  stickyHeader?: boolean
}

export function DataTable<T>({
  data = [],
  columns,
  loading,
  error,
  emptyState,
  searchTerm,
  onSearchClear,
  selectable,
  selectedItems = new Set(),
  onSelectionChange,
  getItemId,
  onRowClick,
  className,
  stickyHeader = false
}: DataTableProps<T>) {
  const handleSelectAll = () => {
    if (!onSelectionChange) return
    
    const allSelected = data.length > 0 && data.every(item => 
      selectedItems.has(getItemId(item))
    )
    
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(data.map(getItemId)))
    }
  }

  const handleSelectItem = (item: T) => {
    if (!onSelectionChange) return
    
    const id = getItemId(item)
    const newSelection = new Set(selectedItems)
    
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    
    onSelectionChange(newSelection)
  }

  const allSelected = data.length > 0 && data.every(item => 
    selectedItems.has(getItemId(item))
  )
  const someSelected = data.some(item => 
    selectedItems.has(getItemId(item))
  )

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={cn(
            'border-b bg-muted/50',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            <tr>
              {selectable && (
                <th className="w-12 p-4">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'p-4 text-left font-medium text-muted-foreground',
                    column.className,
                    column.width
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Show skeletons while loading
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton 
                  key={i} 
                  columns={columns.length + (selectable ? 1 : 0)} 
                />
              ))
            ) : data.length === 0 ? (
              // Show empty state
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="p-8 text-center"
                >
                  {searchTerm && onSearchClear ? (
                    <SearchEmptyState 
                      searchTerm={searchTerm} 
                      onClear={onSearchClear} 
                    />
                  ) : (
                    emptyState || <EmptyState title="No data" />
                  )}
                </td>
              </tr>
            ) : (
              // Show data rows
              data.map((item) => {
                const id = getItemId(item)
                const isSelected = selectedItems.has(id)
                
                return (
                  <tr
                    key={id}
                    className={cn(
                      'border-b transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                      isSelected && 'bg-muted/30'
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <td className="w-12 p-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectItem(item)}
                          aria-label={`Select ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn('p-4', column.className)}
                      >
                        {column.accessor(item)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}