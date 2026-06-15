// Diálogo de confirmación bonito (reemplaza al confirm() nativo del navegador).
//
// Uso:
//   const confirm = useConfirm();
//   if (!(await confirm({ title: 'Eliminar', message: '¿Seguro?', danger: true }))) return;
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({
        title: opts.title || 'Confirmar',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Aceptar',
        cancelText: opts.cancelText || 'Cancelar',
        danger: opts.danger || false,
      });
    });
  }, []);

  const close = useCallback((result) => {
    if (resolver.current) resolver.current(result);
    resolver.current = null;
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal title={state?.title || ''} open={!!state} onClose={() => close(false)} maxWidth="max-w-sm">
        {state && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {state.danger && (
                <div className="bg-red-100 text-red-600 rounded-full p-2 shrink-0">
                  <AlertTriangle size={20} />
                </div>
              )}
              <p className="text-sm text-slate-600 pt-1">{state.message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => close(false)} className="btn-secondary">{state.cancelText}</button>
              <button onClick={() => close(true)} className={state.danger ? 'btn-danger' : 'btn-primary'}>
                {state.confirmText}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
