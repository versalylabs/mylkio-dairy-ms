'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/use-language';

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
  const [lang] = useLanguage();
  const closeLabel = lang === 'sw' ? 'Funga' : 'Close';
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in no-print-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[94dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border border-ivory-border flex flex-col outline-none ${className}`}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-ivory-border sticky top-0 bg-white z-10 no-print">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="w-10 h-10 rounded-2xl bg-[#A8BFA5]/20 text-[#345C4A] flex items-center justify-center shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-xl font-medium text-charcoal">{title}</h2>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          </div>
          <button type="button" data-dialog-close onClick={onClose} aria-label={closeLabel} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-charcoal-muted transition-all duration-300 ease-premium hover:rotate-90 hover:bg-ivory-muted hover:text-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="p-5 pt-3 border-t border-ivory-border flex flex-wrap items-center justify-end gap-3 sticky bottom-0 bg-white no-print">{footer}</div>}
      </div>
    </div>
  );
}

export const fieldLabel = 'field-label';
export const fieldInput = 'field';
export const primaryButton = 'btn btn-primary';
export const secondaryButton = 'btn btn-secondary';

export const ksh = (n: number) => `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
