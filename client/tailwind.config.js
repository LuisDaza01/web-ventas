/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sistema "comercio cálido": fondo crema, marca esmeralda y colores de
        // estado suaves (verde = ok, ámbar = atención, rojo = peligro).
        paper: '#FAF6F0', // fondo general crema cálido
        ink: '#292524', // texto principal (café muy oscuro, no negro puro)
        gris: '#79716B', // texto secundario cálido
        line: '#EAE2D8', // bordes y divisores
        brand: '#059669', // esmeralda: acciones principales
        brandDark: '#047857', // hover del esmeralda
        brandSoft: '#D9F2E5', // fondo suave verde (badges/notas ok)
        accent: '#DC2626', // rojo: peligro, deudas, sin stock
        accentSoft: '#FEE9E7', // fondo suave rojo
        amber: '#B45309', // ámbar: advertencias (texto)
        amberSoft: '#FDEFD2', // fondo suave ámbar
        info: '#2563EB', // azul: informativo (QR, links)
        infoSoft: '#E0ECFE', // fondo suave azul
      },
      fontFamily: {
        display: ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        micro: '0.1em',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(41, 37, 36, 0.06), 0 4px 14px rgba(41, 37, 36, 0.05)',
        lift: '0 4px 20px rgba(41, 37, 36, 0.10)',
      },
    },
  },
  plugins: [],
};
