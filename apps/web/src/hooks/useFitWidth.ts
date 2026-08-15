import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Observa el ancho de un contenedor (ResizeObserver) y lo expone en px.
 * Útil para dimensionar el abanico de cartas según el espacio disponible.
 */
export function useFitWidth<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
