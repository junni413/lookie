import { useEffect, useRef } from 'react';

/**
 * useInterval Hook
 * 
 * Declarative setInterval for React components.
 * 
 * @param callback The function to be called every interval.
 * @param delay The delay in milliseconds. Pass null to pause.
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
