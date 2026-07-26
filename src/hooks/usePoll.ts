import { useEffect, useRef } from "react";

export function usePoll(callback: () => void, intervalMs: number, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    callbackRef.current();
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
