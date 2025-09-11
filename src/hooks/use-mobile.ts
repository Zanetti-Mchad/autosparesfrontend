"use client";

import { useEffect, useState } from "react";

export function useIsMobile(breakpointPx: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();

    // Modern browsers: addEventListener on MediaQueryList
    try {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } catch {
      // Fallback for Safari/old: addListener
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
  }, [breakpointPx]);

  return isMobile;
}


