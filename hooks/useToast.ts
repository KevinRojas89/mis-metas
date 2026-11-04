'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Mensajes cortos que aparecen abajo de la pantalla y se ocultan solos. */
export function useToast(duration = 2800) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, visible, show };
}
