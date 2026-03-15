'use client';

import type { ReactNode } from 'react';

interface ResponsiveViewProps {
  /** Rendered on md+ screens (desktop/tablet) — typically a DataTable */
  desktop: ReactNode;
  /** Rendered on mobile — typically a MobileCardList */
  mobile: ReactNode;
}

/**
 * Renders different content for desktop and mobile using CSS display.
 * Both are in the DOM but only one is visible — avoids layout shift.
 */
export function ResponsiveView({ desktop, mobile }: ResponsiveViewProps) {
  return (
    <>
      <div className="hidden md:block">{desktop}</div>
      <div className="md:hidden">{mobile}</div>
    </>
  );
}
