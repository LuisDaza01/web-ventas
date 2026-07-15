// Analytics opcional, activado solo por variables de entorno (sin variables no
// se carga ningún script; cero impacto en desarrollo).
//
//   VITE_PLAUSIBLE_DOMAIN  -> Plausible (ligero, sin cookies), ej. "webventas.app"
//   VITE_GA_ID             -> Google Analytics 4, ej. "G-XXXXXXXXXX"
export function initAnalytics() {
  const plausible = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  const ga = import.meta.env.VITE_GA_ID;

  if (plausible) {
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = plausible;
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
  }

  if (ga) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ga);
  }
}
