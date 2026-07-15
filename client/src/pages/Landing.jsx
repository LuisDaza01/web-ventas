// Landing pública: página de venta del SaaS para visitantes sin sesión.
// El alta de tiendas es manual (la hace la plataforma), así que el CTA
// principal lleva a WhatsApp para solicitar la tienda.
import { Link } from 'react-router-dom';
import {
  ScanBarcode,
  Package,
  BarChart3,
  Users,
  Smartphone,
  Share2,
  Check,
  ArrowRight,
} from 'lucide-react';

// Número de soporte/ventas de la plataforma (con código de país), configurable
// por entorno. Sin él, los CTA llevan al login.
const WHATSAPP = (import.meta.env.VITE_WHATSAPP_SOPORTE || '').replace(/\D/g, '');

const waLink = (texto) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

const FEATURES = [
  {
    icon: ScanBarcode,
    title: 'Punto de venta con escáner',
    text: 'Cobra en segundos con lector de código de barras o la cámara del celular. Efectivo, QR o fiado.',
  },
  {
    icon: Package,
    title: 'Inventario siempre al día',
    text: 'Cada venta descuenta stock automáticamente. Alertas de stock bajo y control de vencimientos.',
  },
  {
    icon: Share2,
    title: 'Catálogo con pedidos por WhatsApp',
    text: 'Comparte el link de tu catálogo: tus clientes eligen productos y te llega el pedido armado a tu WhatsApp.',
  },
  {
    icon: BarChart3,
    title: 'Reportes de ganancia',
    text: 'Ventas por día, productos más vendidos y ganancia real (precio de venta menos costo).',
  },
  {
    icon: Users,
    title: 'Tu equipo, con roles',
    text: 'Cajeros que solo venden, almacén que solo maneja stock. Cada quien ve lo suyo.',
  },
  {
    icon: Smartphone,
    title: 'Funciona en cualquier equipo',
    text: 'Computadora, tablet o celular. Solo necesitas un navegador, sin instalar nada.',
  },
];

const PLANES = [
  {
    nombre: 'Gratis',
    precio: 0,
    detalle: 'Para empezar hoy',
    items: ['Hasta 50 productos', 'Hasta 3 usuarios', 'POS + inventario', 'Catálogo público'],
  },
  {
    nombre: 'Básico',
    precio: 99,
    detalle: 'Para tiendas en crecimiento',
    destacado: true,
    items: ['Hasta 1000 productos', 'Hasta 10 usuarios', 'Todo lo del plan Gratis', 'Soporte por WhatsApp'],
  },
  {
    nombre: 'Pro',
    precio: 249,
    detalle: 'Sin límites',
    items: ['Productos ilimitados', 'Usuarios ilimitados', 'Todo lo del plan Básico', 'Soporte prioritario'],
  },
];

export default function Landing() {
  const ctaHref = WHATSAPP
    ? waLink('Hola, quiero crear mi tienda en Web Ventas 🙌')
    : '/login';
  const CtaTag = WHATSAPP ? 'a' : Link;
  const ctaProps = WHATSAPP
    ? { href: ctaHref, target: '_blank', rel: 'noreferrer' }
    : { to: '/login' };

  return (
    <div className="min-h-dvh bg-paper">
      {/* Barra superior */}
      <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-display font-semibold text-xl tracking-tight text-ink">
            Web Ventas
          </span>
          <nav className="flex items-center gap-2">
            <a href="#precios" className="hidden sm:block text-sm text-gris hover:text-ink px-3">
              Precios
            </a>
            <Link to="/login" className="btn-secondary !py-2">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-48 h-48 bg-brand opacity-[0.08]"
          style={{ borderRadius: '58% 42% 63% 37% / 55% 48% 52% 45%' }}
        />
        <p className="micro mb-4">Inventario · Punto de venta · Catálogo</p>
        <h1 className="display text-4xl sm:text-6xl leading-tight max-w-3xl mx-auto">
          Controla <span className="text-brand">tu tienda</span> desde el celular
        </h1>
        <p className="text-gris text-lg mt-5 max-w-xl mx-auto">
          Vende con escáner de código de barras, controla tu inventario, fía con registro y
          recibe pedidos por WhatsApp. Todo en un solo lugar, en bolivianos.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <CtaTag {...ctaProps} className="btn-primary !py-3.5 !px-8">
            Crear mi tienda gratis <ArrowRight size={16} strokeWidth={1.5} />
          </CtaTag>
          <Link to="/login" className="btn-secondary !py-3.5 !px-8">
            Ya tengo cuenta
          </Link>
        </div>
        <p className="text-xs text-gris mt-4">
          Plan gratis para siempre · Sin tarjeta de crédito
        </p>
      </section>

      {/* Funcionalidades */}
      <section className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="micro mb-2">Todo lo que tu tienda necesita</p>
          <h2 className="display text-3xl mb-10">Hecho para la tienda de barrio</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white p-7">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brandSoft text-brandDark mb-4">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <h3 className="font-display font-medium text-lg text-ink">{title}</h3>
                <p className="text-sm text-gris mt-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="max-w-6xl mx-auto px-4 py-16">
        <p className="micro mb-2">Precios</p>
        <h2 className="display text-3xl mb-10">Planes simples, en bolivianos</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANES.map((p) => (
            <div key={p.nombre} className={`card p-7 flex flex-col ${p.destacado ? 'border-brand ring-4 ring-brand/10' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="micro">{p.nombre}</h3>
                {p.destacado && <span className="badge badge-ink">Popular</span>}
              </div>
              <p className="display text-4xl mt-3">
                {p.precio === 0 ? 'Gratis' : `Bs ${p.precio}`}
                {p.precio !== 0 && (
                  <span className="text-sm font-sans font-normal text-gris tracking-normal">
                    {' '}
                    /mes
                  </span>
                )}
              </p>
              <p className="text-sm text-gris mt-1">{p.detalle}</p>
              <ul className="mt-6 pt-5 border-t border-line space-y-2.5 text-sm text-gris flex-1">
                {p.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-white shrink-0">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <CtaTag
                {...(WHATSAPP
                  ? { href: waLink(`Hola, me interesa el plan ${p.nombre} de Web Ventas`), target: '_blank', rel: 'noreferrer' }
                  : { to: '/login' })}
                className={`${p.destacado ? 'btn-primary' : 'btn-secondary'} w-full mt-6`}
              >
                Empezar
              </CtaTag>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-line bg-brandDark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="font-display font-medium text-3xl tracking-tight">
            Empieza a vender mejor hoy
          </h2>
          <p className="text-white/70 mt-3 max-w-md mx-auto text-sm">
            Te creamos tu tienda y te acompañamos en la puesta en marcha. Sin costo, sin
            compromiso.
          </p>
          <CtaTag
            {...ctaProps}
            className="btn !bg-white !text-brandDark hover:!bg-white/90 mt-7 !py-3.5 !px-8 inline-flex"
          >
            Crear mi tienda gratis <ArrowRight size={16} strokeWidth={1.5} />
          </CtaTag>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gris">
          <span className="font-display font-semibold text-sm text-ink">Web Ventas</span>
          <span>Inventario y punto de venta para tiendas de barrio · Bolivia</span>
          <Link to="/login" className="hover:text-ink">
            Ingresar
          </Link>
        </div>
      </footer>
    </div>
  );
}
