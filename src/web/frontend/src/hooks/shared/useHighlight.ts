import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseHighlightOptions {
  paramName?: string;
  scrollBehavior?: ScrollBehavior;
  highlightDuration?: number;
  highlightClasses?: string[];
}

/**
 * Custom hook to handle URL parameter-based highlighting
 */
export function useHighlight({
  paramName = 'highlight',
  scrollBehavior = 'smooth',
  highlightDuration = 3000,
  highlightClasses = ['ring-2', 'ring-blue-500', 'ring-offset-2'],
}: UseHighlightOptions = {}) {
  const [searchParams] = useSearchParams();
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

  const highlightValue = searchParams.get(paramName);

  useEffect(() => {
    if (!highlightValue) {
      setHighlightedItem(null);
      return;
    }

    setHighlightedItem(highlightValue);

    // Scroll to element after a short delay
    const scrollTimeout = setTimeout(() => {
      const element = document.getElementById(`endpoint-${highlightValue}`);
      if (element) {
        element.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
        
        // Add highlight classes
        element.classList.add(...highlightClasses);
        
        // Remove highlight after duration
        setTimeout(() => {
          element.classList.remove(...highlightClasses);
          setHighlightedItem(null);
        }, highlightDuration);
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [highlightValue, scrollBehavior, highlightDuration, highlightClasses]);

  return {
    highlightedItem,
    isHighlighted: (itemId: string) => highlightedItem === itemId,
  };
}