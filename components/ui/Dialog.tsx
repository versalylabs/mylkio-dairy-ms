'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra class for the panel, e.g. 'print-area' for printable content. */
  className?: string;
}

/**
 * Accessible modal dialog: labelled, closes on Escape or backdrop click, moves
 * focus inside on open and returns it to the opener on close.
 */
export function Dialog({ open, onClose, title, subtitle, icon, wide, children, footer, className = '' }: DialogProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Callers often pass a new onClose each render; keep the latest without re-running the focus effect.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-dialog-close])');
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col outline-none ${className}`}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 sticky top-0 bg-white z-10 no-print">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="w-10 h-10 rounded-2xl bg-[#A8BFA5]/20 text-[#345C4A] flex items-center justify-center shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          </div>
          <button type="button" data-dialog-close onClick={onClose} aria-label="Close" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="p-5 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3 sticky bottom-0 bg-white no-print">{footer}</div>}
      </div>
    </div>
  );
}

export const fieldLabel = 'block text-sm font-semibold text-gray-800 mb-1';
export const fieldInput = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-base bg-white';
export const primaryButton = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm';
export const secondaryButton = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm';

export const ksh = (n: number) => `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
