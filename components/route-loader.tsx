"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Spinner from "@/components/Spinner"; // your pretty loader from before

export default function RouteLoader({
  minVisibleMs = 800,
  showOnFirstLoad = false,
}: {
  minVisibleMs?: number;
  showOnFirstLoad?: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = useMemo(() => pathname + "?" + (search?.toString() ?? ""), [pathname, search]);

  const first = useRef(true);
  const [visible, setVisible] = useState(showOnFirstLoad);

  useEffect(() => {
    // On first render we usually don't show the overlay unless asked
    if (first.current) {
      first.current = false;
      if (!showOnFirstLoad) return;
    }

    setVisible(true);
    const start = performance.now();

    // Ensure the overlay stays up for at least minVisibleMs
    const hide = () => {
      const elapsed = performance.now() - start;
      const left = Math.max(0, minVisibleMs - elapsed);
      const t2 = setTimeout(() => setVisible(false), left);
      return () => clearTimeout(t2);
    };

    const cleanup = hide();
    return () => {
      // if a new nav happens before this one finishes
      cleanup && cleanup();
    };
  }, [key, minVisibleMs, showOnFirstLoad]);

  if (!visible) return null;
  return <Spinner fullscreen label="Loading…" />;
}
