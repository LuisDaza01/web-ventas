// Ventana modal sencilla y responsive.
import { X } from 'lucide-react';

export default function Modal({ title, open, onClose, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    // En móvil se comporta como hoja inferior (bottom sheet); en pantallas
    // grandes, como modal centrado.
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40">
      <div
        className={`card w-full ${maxWidth} max-h-[92dvh] sm:max-h-[90vh] overflow-auto shadow-lift rounded-b-none sm:rounded-b-2xl pb-[env(safe-area-inset-bottom)] sm:pb-0`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display font-medium text-lg tracking-tight text-ink">{title}</h3>
          <button onClick={onClose} className="text-gris hover:text-ink">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
