'use client';

import { useEffect, useState } from 'react';

/** Barra de progreso que se va llenando con animación. */
export default function ProgressBar({ pct, big = false }: { pct: number; big?: boolean }) {
  const [width, setWidth] = useState(0);

  // Se pinta primero el valor anterior y luego el nuevo, para que la transición CSS se vea
  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 30);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div
      className={`progress${big ? ' big' : ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="bar" style={{ width: `${width}%` }} />
    </div>
  );
}
