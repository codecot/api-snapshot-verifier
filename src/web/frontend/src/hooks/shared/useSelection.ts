import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

export interface UseSelectionReturn<T> {
  selectedItems: Set<string>;
  selectionMode: boolean;
  isSelected: (itemId: string) => boolean;
  isAllSelected: boolean;
  selectedCount: number;
  
  // Actions
  toggleSelection: (itemId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;
  
  // Computed values
  getSelectedItems: () => T[];
}

/**
 * Generic selection hook for managing item selection in lists
 */
export function useSelection<T>({
  items,
  getItemId,
}: UseSelectionOptions<T>): UseSelectionReturn<T> {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Check if all items are selected
  const isAllSelected = useMemo(
    () => selectedItems.size === items.length && items.length > 0,
    [selectedItems.size, items.length]
  );

  // Check if a specific item is selected
  const isSelected = useCallback(
    (itemId: string) => selectedItems.has(itemId),
    [selectedItems]
  );

  // Toggle selection for a single item
  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Select all items
  const selectAll = useCallback(() => {
    setSelectedItems(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Enter selection mode
  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
    setSelectedItems(new Set()); // Clear any existing selections
  }, []);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  }, []);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [selectionMode, enterSelectionMode, exitSelectionMode]);

  // Get the actual selected items
  const getSelectedItems = useCallback(() => {
    return items.filter(item => selectedItems.has(getItemId(item)));
  }, [items, selectedItems, getItemId]);

  return {
    selectedItems,
    selectionMode,
    isSelected,
    isAllSelected,
    selectedCount: selectedItems.size,
    
    // Actions
    toggleSelection,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
    
    // Computed values
    getSelectedItems,
  };
}