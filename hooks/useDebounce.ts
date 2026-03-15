import { useState, useCallback, useRef } from 'react';

/**
 * Hook to prevent double submissions/clicks
 * Returns a debounced function that only executes once within the specified delay
 */
export function useDebounce<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 500
): [T, boolean] {
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      // If already processing, ignore the call
      if (isProcessing) {
        console.warn('⚠️ Action already in progress, ignoring duplicate call');
        return Promise.resolve();
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsProcessing(true);

      // Execute the callback
      return callback(...args)
        .finally(() => {
          // Reset after delay to prevent rapid successive calls
          timeoutRef.current = setTimeout(() => {
            setIsProcessing(false);
          }, delay);
        });
    }) as T,
    [callback, delay, isProcessing]
  );

  return [debouncedCallback, isProcessing];
}

/**
 * Simple hook to disable a button while processing
 */
export function useSubmitOnce() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const execute = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (isSubmitting) {
      console.warn('⚠️ Already submitting, ignoring duplicate call');
      return undefined;
    }

    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  return { execute, isSubmitting };
}
