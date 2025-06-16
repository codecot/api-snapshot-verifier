import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  itemsToDelete?: string[];
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  additionalOptions?: React.ReactNode;
}

/**
 * Reusable delete confirmation dialog
 */
export function DeleteConfirmDialog({
  isOpen,
  title = 'Confirm Deletion',
  message,
  itemsToDelete = [],
  isDeleting = false,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  additionalOptions,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">{message}</div>

            {/* Items to be deleted */}
            {itemsToDelete.length > 0 && (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-xs text-red-700 font-medium mb-2">
                  {itemsToDelete.length === 1
                    ? 'Item to be deleted:'
                    : 'Items to be deleted:'}
                </p>
                <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                  {itemsToDelete.map((item) => (
                    <li key={item} className="flex items-center gap-1">
                      <Trash2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate" title={item}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional options (like delete snapshots checkbox) */}
            {additionalOptions}

            <p className="text-xs text-gray-500">
              ⚠️ This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {confirmText}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isDeleting}
                className="flex-1"
              >
                {cancelText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}