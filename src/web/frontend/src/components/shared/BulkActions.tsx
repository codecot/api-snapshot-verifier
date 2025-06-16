import React from 'react';
import { CheckSquare, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface BulkActionsProps {
  isVisible: boolean;
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isLoading?: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExit: () => void;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Reusable bulk actions toolbar component
 */
export function BulkActions({
  isVisible,
  selectedCount,
  totalCount,
  isAllSelected,
  isLoading = false,
  onSelectAll,
  onClearSelection,
  onExit,
  actions,
  className = '',
}: BulkActionsProps) {
  if (!isVisible || totalCount === 0) return null;

  return (
    <Card className={`bg-blue-50 border-blue-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) =>
                  e.target.checked ? onSelectAll() : onClearSelection()
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-800 border-gray-300 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span
                className="text-sm font-medium text-blue-800 cursor-pointer hover:text-blue-900"
                onClick={() =>
                  isAllSelected ? onClearSelection() : onSelectAll()
                }
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
                {selectedCount > 0 && ` (${selectedCount}/${totalCount})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Custom actions passed as children */}
            {actions}

            {/* Close Selection Mode */}
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              title="Exit selection mode and return to normal view"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}