// Escáner de código de barras / QR con la cámara del dispositivo.
//
// Para que detecte RÁPIDO:
//  1) Usa el detector NATIVO del navegador (`BarcodeDetector`, acelerado por
//     hardware en Chrome/Android) cuando está disponible.
//  2) Si no existe (iPhone/Safari), cae a ZXing.
//  3) En ambos casos limita los formatos a los de tienda + QR (menos formatos =
//     más veloz) y pide la cámara trasera con buena resolución.
//
// Requiere HTTPS (o localhost) para acceder a la cámara.
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { X, ScanLine } from 'lucide-react';

// Formatos que realmente usamos (códigos de tienda + QR).
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
];
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];

const VIDEO_CONSTRAINTS = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

export default function BarcodeScanner({ open, onDetected, onClose }) {
  const videoRef = useRef(null);
  const lastRef = useRef({ code: '', t: 0 });
  // Guardamos onDetected en un ref para NO reiniciar la cámara en cada render.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setError('');

    let cancelled = false;
    let controls; // ZXing
    let stream; // detector nativo
    let timer; // bucle nativo

    // Anti-rebote: ignora el mismo código repetido en menos de 1.5 s.
    const emit = (code) => {
      if (!code) return;
      const now = Date.now();
      if (code === lastRef.current.code && now - lastRef.current.t < 1500) return;
      lastRef.current = { code, t: now };
      onDetectedRef.current(code);
    };

    function cleanup() {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try {
        controls?.stop();
      } catch {
        /* noop */
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function prepararVideo() {
      const v = videoRef.current;
      if (!v) return;
      v.setAttribute('playsinline', 'true');
      v.muted = true;
      try {
        await v.play();
      } catch {
        /* el botón ya cuenta como gesto del usuario */
      }
    }

    // 1) Detector nativo (rápido).
    async function startNative() {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      const detector = new window.BarcodeDetector(
        formats.length ? { formats } : undefined
      );
      stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
      if (cancelled) return cleanup();
      videoRef.current.srcObject = stream;
      await prepararVideo();

      const tick = async () => {
        if (cancelled) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length) emit(codes[0].rawValue);
        } catch {
          /* errores por frame: ignorar */
        }
        timer = setTimeout(tick, 150);
      };
      tick();
    }

    // 2) ZXing (respaldo) con formatos limitados.
    async function startZxing() {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
      const reader = new BrowserMultiFormatReader(hints);
      controls = await reader.decodeFromConstraints(
        { video: VIDEO_CONSTRAINTS },
        videoRef.current,
        (result) => {
          if (result) emit(result.getText());
        }
      );
      if (cancelled) return cleanup();
      await prepararVideo();
    }

    (async () => {
      try {
        if ('BarcodeDetector' in window) {
          await startNative();
        } else {
          await startZxing();
        }
      } catch (e) {
        // Si el nativo falla por algún motivo, intentamos ZXing.
        try {
          if (!cancelled && !controls) await startZxing();
        } catch {
          const name = e?.name || '';
          setError(
            name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Habilítalo en el navegador y recarga.'
              : 'No se pudo abrir la cámara. Asegúrate de usar HTTPS y de dar permiso.'
          );
        }
      }
    })();

    return cleanup;
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-md border border-line overflow-hidden w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="flex items-center gap-2 font-display font-medium text-ink">
            <ScanLine size={18} strokeWidth={1.5} /> Escanear con cámara
          </span>
          <button onClick={onClose} className="p-1 text-gris hover:text-ink">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative bg-ink aspect-[4/3]">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-1/3 border border-white/80 rounded-md" />
          </div>
        </div>

        <div className="p-4">
          {error ? (
            <p className="note-error">{error}</p>
          ) : (
            <p className="text-sm text-gris text-center">
              Apunta la cámara al código de barras o QR del producto.
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
