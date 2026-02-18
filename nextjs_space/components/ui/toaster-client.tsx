'use client';

import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

/**
 * Client-only Toaster wrapper to prevent hydration errors
 * Portals can't be rendered during SSR, so we only render after mount
 */
export function ToasterClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Toaster />;
}
