// Escáner de código de barras con la cámara del dispositivo (ZXing).
// Lectura continua: cada código detectado se envía a onDetected. Evita repetir
// el mismo código en menos de 1.5 s. Requiere HTTPS (o localhost) para la cámara.
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, ScanLine } from 'lucide-react';

export default function BarcodeScanner({ open, onDetected, onClose }) {
  const videoRef = useRef(null);
  const lastRef = useRef({ code: '', t: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    const reader = new BrowserMultiFormatReader();
    let controls;
    let cancelled = false;

    const onResult = (result) => {
      if (!result) return;
      const code = result.getText();
      const now = Date.now();
      if (code === lastRef.current.code && now - lastRef.current.t < 1500) return;
      lastRef.current = { code, t: now };
      onDetected(code);
    };

    (async () => {
      try {
        // Pide la cámara trasera (mejor para escanear). Si no hay, usa la que haya.
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          onResult
        );
        // iOS/Safari: reproducir en línea y en silencio o el video sale negro.
        const v = videoRef.current;
        if (v) {
          v.setAttribute('playsinline', 'true');
          v.muted = true;
          try {
            await v.play();
          } catch {
            /* el autoplay puede requerir interacción; el botón ya cuenta como gesto */
          }
        }
        if (cancelled && controls) controls.stop();
      } catch (e) {
        const name = e?.name || '';
        setError(
          name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítalo en los ajustes del navegador y recarga.'
            : 'No se pudo abrir la cámara. Asegúrate de usar HTTPS y de dar permiso.'
        );
      }
    })();

    return () => {
      cancelled = true;
      try {
        controls?.stop();
      } catch {
        /* noop */
      }
    };
  }, [open, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="flex items-center gap-2 font-semibold text-slate-800">
            <ScanLine size={18} className="text-brand-600" /> Escanear con cámara
          </span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3]">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {/* Guía visual */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-1/3 border-2 border-brand-400/80 rounded-lg" />
          </div>
        </div>

        <div className="p-4">
          {error ? (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          ) : (
            <p className="text-sm text-slate-500 text-center">
              Apunta la cámara al código de barras del producto.
            </p>
          )}
          <button onClick={onClose} className="btn-secondary w-full mt-3">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
