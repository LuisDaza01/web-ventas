// Pitido corto generado con Web Audio (sin archivos de audio).
// Se usa al leer un código de barras para dar confirmación sonora y evitar
// que el operador vuelva a escanear el mismo producto.
//
//   beep(true)  -> tono agudo  (producto agregado)
//   beep(false) -> tono grave  (no encontrado / error)
let ctx;

export function beep(ok = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = ctx || new AudioCtx();
    // El navegador suspende el audio hasta que hay un gesto del usuario;
    // escanear/teclear cuenta como gesto, así que lo reanudamos al vuelo.
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.value = ok ? 880 : 200;

    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.15 : 0.3));

    osc.start(t);
    osc.stop(t + (ok ? 0.16 : 0.31));
  } catch {
    /* sin audio: no pasa nada */
  }
}
