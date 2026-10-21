import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-red-950/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-red-200 bg-white shadow-lift animate-pop sm:rounded-2xl ${sizes[size]}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-red-100 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-red-950">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-red-800 hover:bg-red-100" aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-red-100 bg-red-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false, loading = false, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
            Go back
          </button>
          <button type="button" className={danger ? 'btn-dark' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmText}
          </button>
        </>
      }
    >
      {message && <p className="text-sm text-red-900">{message}</p>}
      {children}
    </Modal>
  );
}
