'use client';

import { type ReactNode, useEffect, useRef } from 'react';

type Props = {
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
};

/** Ventana modal basada en <dialog>. Se abre al montarse; se cierra con Esc o clic afuera. */
export default function Modal({ onClose, children, labelledBy }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
